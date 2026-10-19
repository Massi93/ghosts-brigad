/**
 * Envois d'emails tracés en base (table `email_logs`) :
 * confirmation d'inscription, envoi manuel depuis le cockpit, email de test.
 */
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import { db, nowIso } from "../db/index.js";
import { sendMail } from "./mailer.js";
import { confirmationEmail, manualEmail, testEmail } from "./templates.js";

/** Progression des envois manuels (relayée au cockpit par Socket.io). */
export const mailEvents = new EventEmitter();

/**
 * Crée la ligne de journal (statut `pending`). Retourne son id, ou `null` si elle
 * existe déjà (rappel déjà envoyé : l'index unique empêche les doublons).
 */
export function createLog({ registrationId = null, liveId = null, kind, batchId = null, to, subject }) {
  const { changes, lastInsertRowid } = db
    .prepare(
      `INSERT OR IGNORE INTO email_logs (registration_id, live_id, kind, batch_id, to_email, subject)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(registrationId, liveId, kind, batchId, to, subject);
  return changes ? Number(lastInsertRowid) : null;
}

/** Envoie l'email et met à jour son statut. Ne lève pas d'erreur. */
export async function deliverLogged(logId, to, content) {
  try {
    await sendMail({ to, ...content });
    db.prepare("UPDATE email_logs SET status = 'sent', sent_at = ?, error = NULL WHERE id = ?").run(nowIso(), logId);
    return { status: "sent" };
  } catch (err) {
    const error = String(err?.message || err).slice(0, 500);
    db.prepare("UPDATE email_logs SET status = 'failed', error = ? WHERE id = ?").run(error, logId);
    console.warn(`[mail] Échec d'envoi à ${to} : ${error}`);
    return { status: "failed", error };
  }
}

/** Email de confirmation juste après l'inscription. */
export async function sendConfirmation(registration, live) {
  const content = confirmationEmail(registration, live);
  const logId = createLog({
    registrationId: registration.id,
    liveId: live?.id ?? null,
    kind: "confirmation",
    to: registration.email,
    subject: content.subject,
  });
  return deliverLogged(logId, registration.email, content);
}

/**
 * Envoi manuel aux inscrits cochés dans le cockpit.
 * Retourne immédiatement `{ batchId, total }` ; les statuts arrivent ensuite via
 * `mailEvents` ("progress" pour chaque email, "done" à la fin).
 */
export function sendManualBatch({ registrationIds, subject, message, liveId = null }) {
  const placeholders = registrationIds.map(() => "?").join(",");
  const recipients = db
    .prepare(
      `SELECT * FROM registrations WHERE id IN (${placeholders}) AND unsubscribed_at IS NULL`
    )
    .all(...registrationIds);

  const batchId = crypto.randomUUID();
  const jobs = recipients.map((registration) => {
    const content = manualEmail(registration, { subject, message });
    const logId = createLog({
      registrationId: registration.id,
      liveId,
      kind: "manual",
      batchId,
      to: registration.email,
      subject: content.subject,
    });
    return { registration, content, logId };
  });

  // Traitement en arrière-plan (la file de `mailer.js` gère le débit).
  (async () => {
    let sent = 0;
    let failed = 0;
    for (const { registration, content, logId } of jobs) {
      const result = await deliverLogged(logId, registration.email, content);
      if (result.status === "sent") sent += 1;
      else failed += 1;
      mailEvents.emit("progress", {
        batchId,
        registrationId: registration.id,
        logId,
        status: result.status,
        error: result.error ?? null,
        sentAt: result.status === "sent" ? nowIso() : null,
      });
    }
    mailEvents.emit("done", { batchId, total: jobs.length, sent, failed });
  })();

  return {
    batchId,
    total: jobs.length,
    skipped: registrationIds.length - jobs.length, // désinscrits ou introuvables
    recipients: jobs.map(({ registration, logId }) => ({ registrationId: registration.id, logId })),
  };
}

/** Email de test vers une adresse quelconque (vérification de la config SMTP). */
export async function sendTestEmail(to) {
  const content = testEmail();
  const logId = createLog({ kind: "test", to, subject: content.subject });
  return deliverLogged(logId, to, content);
}

/** Statuts d'un lot d'envoi manuel. */
export function getBatch(batchId) {
  return db
    .prepare(
      `SELECT id AS logId, registration_id AS registrationId, to_email AS email, status, error, sent_at AS sentAt
         FROM email_logs WHERE batch_id = ? ORDER BY id`
    )
    .all(batchId);
}
