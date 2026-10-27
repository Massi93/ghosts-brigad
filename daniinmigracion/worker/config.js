/**
 * Configuration centralisée du serveur Live (Cloudflare Worker + Durable Object).
 *
 * Les valeurs viennent des variables Cloudflare :
 *  - `vars` de wrangler.jsonc (valeurs publiques : URL du site, fuseau horaire…) ;
 *  - secrets (`npx wrangler secret put NOM`) : mot de passe, clés SMTP / API ;
 *  - en local, le fichier `.dev.vars` (voir `.dev.vars.example`).
 *
 * `loadConfig(env)` est appelé une fois au démarrage du Durable Object ; les
 * modules lisent ensuite l'objet `config` exporté.
 */

/** Lit un booléen ("true", "1", "yes", "on"). */
function bool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

/** Lit un entier positif. */
function int(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Liste des serveurs ICE (STUN/TURN) pour WebRTC.
 * - liste d'URLs séparées par des virgules : `stun:stun.cloudflare.com:3478` ;
 * - ou JSON complet : `[{"urls":"turn:...","username":"...","credential":"..."}]`.
 */
function iceServers(value) {
  if (!value || !String(value).trim()) return [];
  const raw = String(value).trim();
  if (raw.startsWith("[")) {
    try {
      return JSON.parse(raw);
    } catch {
      console.warn("[config] ICE_SERVERS n'est pas un JSON valide, ignoré.");
      return [];
    }
  }
  return raw
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)
    .map((urls) => ({ urls }));
}

/** « Dani Inmigración <live@daniinmigracion.com> » → { name, email } */
export function parseAddress(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: "", email: raw };
}

/** Configuration courante (remplie par `loadConfig`). */
export const config = {};

/** Remplit `config` à partir des variables d'environnement du Worker. */
export function loadConfig(env = {}) {
  const mailMode = String(env.MAIL_MODE || "console").toLowerCase();
  Object.assign(config, {
    // Adresse publique du site (liens des emails). En production :
    // https://www.daniinmigracion.com (le Live est servi par le site lui-même).
    publicUrl: String(env.PUBLIC_URL || "http://localhost:8787").replace(/\/+$/, ""),

    // Compte du cockpit. Le mot de passe n'est jamais stocké en clair :
    // ADMIN_PASSWORD_HASH contient son hash PBKDF2 (npm run cockpit:password).
    admin: {
      username: String(env.ADMIN_USERNAME || "dani").trim(),
      passwordHash: String(env.ADMIN_PASSWORD_HASH || "").trim(),
      // Variante plus simple (secret en clair chiffré par Cloudflare), hashée au démarrage.
      password: env.ADMIN_PASSWORD ? String(env.ADMIN_PASSWORD) : "",
    },

    session: {
      cookieName: "dani_cockpit",
      ttlHours: Math.max(1, int(env.SESSION_TTL_HOURS, 12)),
      // "auto" = cookie `Secure` dès que la requête arrive en HTTPS.
      cookieSecure: String(env.COOKIE_SECURE || "auto").toLowerCase(),
    },

    mail: {
      // console : aucun envoi réel (emails visibles dans le cockpit et les logs)
      // smtp    : serveur SMTP (Brevo, Gmail, OVH, Mailtrap…)
      // brevo / resend : API HTTP du fournisseur (clé MAIL_API_KEY)
      mode: ["smtp", "brevo", "resend"].includes(mailMode) ? mailMode : "console",
      from: env.MAIL_FROM || "Dani Inmigración <no-reply@daniinmigracion.com>",
      apiKey: env.MAIL_API_KEY || "",
      smtp: {
        host: env.SMTP_HOST || "",
        port: int(env.SMTP_PORT, 587),
        secure: bool(env.SMTP_SECURE, false),
        user: env.SMTP_USER || "",
        pass: env.SMTP_PASS || "",
      },
      // Débit max d'emails par seconde (protège le quota du fournisseur).
      ratePerSecond: Math.max(1, int(env.MAIL_RATE_PER_SECOND, 5)),
    },

    reminders: {
      enabled: bool(env.REMINDERS_ENABLED, true),
    },

    // Fuseau horaire utilisé dans les emails (le site, lui, affiche l'heure locale du visiteur).
    timezone: env.SITE_TIMEZONE || "Europe/Madrid",

    live: {
      iceServers: iceServers(env.ICE_SERVERS),
      // Relais TURN de Cloudflare (optionnel) : voir live/iceServers.js.
      cloudflareTurn: {
        keyId: env.CLOUDFLARE_TURN_KEY_ID || "",
        apiToken: env.CLOUDFLARE_TURN_API_TOKEN || "",
      },
      // Diffusion en "mesh" WebRTC : chaque viewer reçoit un flux direct depuis le navigateur de Dani.
      maxViewers: Math.max(1, int(env.MAX_VIEWERS, 50)),
      // Connexions simultanées max depuis une même IP publique (anti-accaparement des places).
      maxViewersPerIp: Math.max(1, int(env.MAX_VIEWERS_PER_IP, 5)),
      // Délai avant de terminer automatiquement un live dont la caméra s'est déconnectée.
      graceSeconds: int(env.LIVE_GRACE_SECONDS, 180),
      // Un live programmé non démarré est marqué "manqué" après ce délai.
      missedAfterMinutes: int(env.LIVE_MISSED_AFTER_MINUTES, 120),
    },
  });
  return config;
}
