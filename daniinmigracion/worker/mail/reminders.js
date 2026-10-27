/**
 * Rappels automatiques : un email 3 h avant le live, un second 5 min avant.
 *
 * Le Durable Object se réveille tout seul (alarme Cloudflare) aux bons moments :
 * il n'a pas besoin qu'un visiteur soit connecté. L'index unique de `email_logs`
 * garantit qu'une personne ne reçoit jamais deux fois le même rappel.
 *
 * Règles :
 *  - rappel « 3 h » : envoyé entre H-3h et H-5min, aux inscrits arrivés AVANT
 *    l'ouverture de cette fenêtre (les suivants ont déjà reçu la confirmation
 *    avec la date). Si le live est programmé moins de 3 h à l'avance, le texte
 *    indique le temps réellement restant.
 *  - rappel « 5 min » : envoyé entre H-5min et H+2min à tous les inscrits actifs.
 */
import { db } from "../db.js";
import { config } from "../config.js";
import { markMissedLives } from "../live/livesRepo.js";
import { reminderEmail } from "./templates.js";
import { createLog, deliverLogged } from "./notifications.js";

const H3 = 3 * 3600_000;
const M5 = 5 * 60_000;
const LATE_GRACE = 2 * 60_000;
const ACTIVE_TICK_MS = 30_000; // pendant les fenêtres de rappel : vérification toutes les 30 s

let running = false;

/** Inscrits actifs n'ayant pas encore reçu ce rappel pour ce live. */
function pendingRecipients(liveId, kind, registeredBefore) {
  return db
    .prepare(
      `SELECT r.* FROM registrations r
        WHERE r.unsubscribed_at IS NULL
          AND r.created_at <= ?
          AND NOT EXISTS (
            SELECT 1 FROM email_logs e
             WHERE e.registration_id = r.id AND e.live_id = ? AND e.kind = ?
          )`
    )
    .all(registeredBefore, liveId, kind);
}

async function sendReminders(live, kind, registeredBefore) {
  const recipients = pendingRecipients(live.id, kind, registeredBefore);
  if (!recipients.length) return 0;
  console.log(`[rappels] ${kind} pour le live #${live.id} → ${recipients.length} destinataire(s)`);
  for (const registration of recipients) {
    const msBefore = new Date(live.scheduled_at).getTime() - Date.now();
    const content = reminderEmail(registration, live, kind, Math.max(msBefore, 0));
    const logId = createLog({
      registrationId: registration.id,
      liveId: live.id,
      kind,
      to: registration.email,
      subject: content.subject,
    });
    if (logId) await deliverLogged(logId, registration.email, content, { priority: true });
  }
  return recipients.length;
}

/**
 * Un live a été reprogrammé : ses rappels repartent de zéro pour que les
 * inscrits reçoivent la nouvelle heure.
 */
export function resetReminders(liveId) {
  db.prepare("DELETE FROM email_logs WHERE live_id = ? AND kind IN ('reminder_3h', 'reminder_5m')").run(liveId);
}

/** Un passage du planificateur. */
export async function checkReminders({ onLivesChanged } = {}) {
  if (running) return;
  running = true;
  try {
    // Les lives jamais démarrés longtemps après l'heure prévue sont marqués « manqués ».
    if (markMissedLives() > 0) onLivesChanged?.();
    if (!config.reminders.enabled) return;

    const now = Date.now();
    const lives = db
      .prepare(
        `SELECT * FROM lives
          WHERE status = 'scheduled' AND scheduled_at IS NOT NULL
            AND scheduled_at BETWEEN ? AND ?`
      )
      .all(new Date(now - LATE_GRACE).toISOString(), new Date(now + H3).toISOString());

    for (const live of lives) {
      const start = new Date(live.scheduled_at).getTime();
      const msBefore = start - now;
      if (msBefore <= H3 && msBefore > M5) {
        await sendReminders(live, "reminder_3h", new Date(start - H3).toISOString());
      } else if (msBefore <= M5 && msBefore > -LATE_GRACE) {
        await sendReminders(live, "reminder_5m", new Date(now).toISOString());
      }
    }
  } catch (err) {
    console.error("[rappels] Erreur :", err?.stack || err);
  } finally {
    running = false;
  }
}

/**
 * Prochain moment où le planificateur doit tourner (ms), ou `null` s'il n'y a rien à faire :
 * ouverture des fenêtres de rappel, et passage au statut « manqué ».
 */
export function nextReminderCheck(now = Date.now()) {
  const missedMs = config.live.missedAfterMinutes * 60_000;
  const lives = db
    .prepare("SELECT scheduled_at FROM lives WHERE status = 'scheduled' AND scheduled_at IS NOT NULL")
    .all();
  let next = null;
  const consider = (t) => {
    if (next === null || t < next) next = t;
  };
  for (const { scheduled_at } of lives) {
    const start = Date.parse(scheduled_at);
    if (!Number.isFinite(start)) continue;
    if (config.reminders.enabled) {
      if (now < start - H3) consider(start - H3); // ouverture de la fenêtre « 3 h »
      else if (now < start - M5) consider(Math.min(now + 10 * 60_000, start - M5));
      // Fenêtre « 5 min » : vérification fréquente (inscriptions de dernière minute).
      else if (now <= start + LATE_GRACE) consider(now + ACTIVE_TICK_MS);
    }
    consider(Math.max(start + missedMs + 1000, now + ACTIVE_TICK_MS));
  }
  return next;
}
