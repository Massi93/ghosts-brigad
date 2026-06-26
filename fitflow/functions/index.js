/**
 * FitFlow Cloud Functions (Firebase, 2nd gen).
 *
 *  - coach            : secure proxy to OpenAI. Keeps the API key server-side
 *                       so it is never shipped inside the mobile app.
 *  - revenuecatWebhook: receives RevenueCat events and updates the user's
 *                       Premium entitlement in Firestore (users/{uid}).
 *
 * Secrets (set once, never committed):
 *   firebase functions:secrets:set OPENAI_API_KEY
 *   firebase functions:secrets:set REVENUECAT_WEBHOOK_SECRET
 *
 * Deploy: npm install && firebase deploy --only functions
 */
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const REVENUECAT_WEBHOOK_SECRET = defineSecret("REVENUECAT_WEBHOOK_SECRET");

const REGION = "europe-west1";

/**
 * POST /coach  { model?: string, messages: [{role, content}] }
 * → 200 { reply: string }
 *
 * The Flutter app (AiCoachService) builds the system prompt + history and
 * calls this endpoint via API_BASE_URL. The key lives only here.
 */
exports.coach = onRequest(
    {secrets: [OPENAI_API_KEY], cors: true, region: REGION},
    async (req, res) => {
      if (req.method !== "POST") {
        res.status(405).json({error: "Method not allowed"});
        return;
      }
      const body = req.body || {};
      const model = body.model || "gpt-4o-mini";
      const messages = body.messages;
      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({error: "messages[] is required"});
        return;
      }
      try {
        const upstream = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY.value()}`,
              },
              body: JSON.stringify({
                model,
                messages,
                temperature: 0.7,
                max_tokens: 400,
              }),
            },
        );
        if (!upstream.ok) {
          logger.error("OpenAI error", upstream.status, await upstream.text());
          res.status(502).json({error: "Upstream model error"});
          return;
        }
        const data = await upstream.json();
        const reply =
          (data.choices &&
            data.choices[0] &&
            data.choices[0].message &&
            data.choices[0].message.content) || "";
        res.json({reply: reply.trim()});
      } catch (err) {
        logger.error("coach failed", err);
        res.status(500).json({error: "Internal error"});
      }
    },
);

/**
 * POST /revenuecatWebhook  (Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>)
 * Updates users/{app_user_id}.premium based on the subscription event.
 * Configure the URL + Authorization header in the RevenueCat dashboard.
 */
exports.revenuecatWebhook = onRequest(
    {secrets: [REVENUECAT_WEBHOOK_SECRET], region: REGION},
    async (req, res) => {
      const auth = req.get("Authorization");
      if (auth !== `Bearer ${REVENUECAT_WEBHOOK_SECRET.value()}`) {
        res.status(401).send("Unauthorized");
        return;
      }
      const event = req.body && req.body.event;
      if (!event) {
        res.status(400).send("No event payload");
        return;
      }
      const uid = event.app_user_id;
      const type = event.type;

      const activating = [
        "INITIAL_PURCHASE",
        "RENEWAL",
        "UNCANCELLATION",
        "PRODUCT_CHANGE",
        "NON_RENEWING_PURCHASE",
      ];
      const deactivating = ["CANCELLATION", "EXPIRATION", "SUBSCRIPTION_PAUSED"];

      let premium = null;
      if (activating.includes(type)) premium = true;
      else if (deactivating.includes(type)) premium = false;

      if (uid && premium !== null) {
        await admin
            .firestore()
            .collection("users")
            .doc(uid)
            .set(
                {
                  premium,
                  premiumUpdatedAt:
                    admin.firestore.FieldValue.serverTimestamp(),
                },
                {merge: true},
            );
        logger.info(`Premium=${premium} for ${uid} (${type})`);
      }
      res.status(200).send("ok");
    },
);
