/**
 * Rappels automatiques : un email 3 h avant le live, un second 5 min avant.
 *
 * Un minuteur vérifie toutes les REMINDER_CHECK_SECONDS secondes les lives
 * programmés. L'index unique de `email_logs` garantit qu'une personne ne reçoit
 * jamais deux fois le même rappel, même après un redémarrage du serveur.
 *
 * Règles :
 *  - rappel « 3 h » : envoyé entre H-3h et H-5min, aux inscrits arrivés AVANT
 *    l'ouverture de cette fenêtre (les suivants ont déjà reçu la confirmation
 *    avec la date). Si le live est programmé moins de 3 h à l'avance, le texte
 *    indique le temps réellement restant.
 *  - rappel « 5 min » : envoyé entre H-5min et H+2min à tous les inscrits actifs.
 */
import { db } from "../db/index.js";
import { config } from "../config.js";
import { markMissedLives } from "../live/livesRepo.js";
import { reminderEmail } from "./templates.js";
import { createLog, deliverLogged } from "./notifications.js";

const H3 = 3 * 3600_000;
const M5 = 5 * 60_000;
const LATE_GRACE = 2 * 60_000;

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
    if (logId) await deliverLogged(logId, registration.email, content);
  }
  return recipients.length;
}

/** Un passage du planificateur (exporté pour les tests). */
export async function checkReminders({ onLivesChanged } = {}) {
  if (running) return;
  running = true;
  try {
    // Les lives jamais démarrés longtemps après l'heure prévue sont marqués « manqués ».
    if (markMissedLives() > 0) onLivesChanged?.();

    const now = Date.now();
    const lives = db
      .prepare(
        `SELECT * FROM lives
          WHERE status IN ('scheduled', 'live') AND scheduled_at IS NOT NULL
            AND scheduled_at BETWEEN ? AND ?`
      )
      .all(new Date(now - LATE_GRACE).toISOString(), new Date(now + H3).toISOString());

    for (const live of lives) {
      const start = new Date(live.scheduled_at).getTime();
      const msBefore = start - now;

      // Le live a déjà démarré : plus de rappel (les inscrits ont reçu le précédent).
      if (live.status !== "scheduled") continue;

      if (msBefore <= H3 && msBefore > M5) {
        const windowOpen = new Date(start - H3).toISOString();
        await sendReminders(live, "reminder_3h", windowOpen);
      } else if (msBefore <= M5 && msBefore > -LATE_GRACE) {
        await sendReminders(live, "reminder_5m", new Date(now).toISOString());
      }
    }
  } catch (err) {
    console.error("[rappels] Erreur :", err);
  } finally {
    running = false;
  }
}

/** Démarre le planificateur de rappels. */
export function startReminderScheduler(hooks) {
  if (!config.reminders.enabled) {
    console.log("[rappels] Désactivés (REMINDERS_ENABLED=false).");
    return;
  }
  const tick = () => checkReminders(hooks);
  setTimeout(tick, 2000).unref();
  setInterval(tick, config.reminders.checkEverySeconds * 1000).unref();
  console.log(`[rappels] Planificateur actif (vérification toutes les ${config.reminders.checkEverySeconds} s).`);
}
