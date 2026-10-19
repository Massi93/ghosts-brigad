/**
 * Accès en base aux lives (table `lives`).
 */
import { db, nowIso } from "../db/index.js";
import { config } from "../config.js";

/** Forme publique d'un live (camelCase, sans les colonnes internes). */
export function toPublicLive(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    scheduledAt: row.scheduled_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

/** Forme complète pour le cockpit (inclut les statistiques). */
export function toAdminLive(row) {
  if (!row) return null;
  return {
    ...toPublicLive(row),
    hearts: row.hearts,
    peakViewers: row.peak_viewers,
    totalViewers: row.total_viewers,
    createdAt: row.created_at,
    recordings: row.recordings ?? undefined,
  };
}

export function getLive(id) {
  return db.prepare("SELECT * FROM lives WHERE id = ?").get(id) ?? null;
}

/** Live actuellement en cours (statut `live`). */
export function getActiveLive() {
  return (
    db.prepare("SELECT * FROM lives WHERE status = 'live' ORDER BY started_at DESC LIMIT 1").get() ??
    null
  );
}

/** Seuil avant lequel un live programmé non démarré est considéré comme manqué. */
function missedThresholdIso() {
  return new Date(Date.now() - config.live.missedAfterMinutes * 60_000).toISOString();
}

/** Prochain live programmé (le plus proche, éventuellement en léger retard). */
export function getNextScheduled() {
  return (
    db
      .prepare(
        `SELECT * FROM lives
          WHERE status = 'scheduled' AND scheduled_at >= ?
          ORDER BY scheduled_at ASC LIMIT 1`
      )
      .get(missedThresholdIso()) ?? null
  );
}

export function listUpcoming() {
  return db
    .prepare(
      `SELECT * FROM lives WHERE status = 'scheduled' AND scheduled_at >= ?
        ORDER BY scheduled_at ASC`
    )
    .all(missedThresholdIso());
}

export function listPast(limit = 50) {
  return db
    .prepare(
      `SELECT l.*, (SELECT COUNT(*) FROM recordings r WHERE r.live_id = l.id) AS recordings
         FROM lives l
        WHERE l.status IN ('ended', 'cancelled', 'missed')
        ORDER BY COALESCE(l.started_at, l.scheduled_at, l.created_at) DESC
        LIMIT ?`
    )
    .all(limit);
}

export function createLive({ title, description = null, scheduledAt = null, status = "scheduled" }) {
  const startedAt = status === "live" ? nowIso() : null;
  const { lastInsertRowid } = db
    .prepare(
      "INSERT INTO lives (title, description, scheduled_at, status, started_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(title, description, scheduledAt, status, startedAt);
  return getLive(lastInsertRowid);
}

export function updateScheduledLive(id, { title, description, scheduledAt }) {
  db.prepare(
    `UPDATE lives SET title = ?, description = ?, scheduled_at = ?
      WHERE id = ? AND status = 'scheduled'`
  ).run(title, description, scheduledAt, id);
  return getLive(id);
}

export function cancelLive(id) {
  return db
    .prepare("UPDATE lives SET status = 'cancelled' WHERE id = ? AND status = 'scheduled'")
    .run(id).changes;
}

/** Passe un live programmé au statut `live`. */
export function markLiveStarted(id) {
  db.prepare("UPDATE lives SET status = 'live', started_at = ? WHERE id = ?").run(nowIso(), id);
  return getLive(id);
}

/** Termine un live et fige ses statistiques. */
export function markLiveEnded(id, { hearts, peakViewers, totalViewers }) {
  db.prepare(
    `UPDATE lives SET status = 'ended', ended_at = ?, hearts = ?, peak_viewers = ?, total_viewers = ?
      WHERE id = ?`
  ).run(nowIso(), hearts, peakViewers, totalViewers, id);
  return getLive(id);
}

/** Sauvegarde intermédiaire des statistiques pendant le live. */
export function saveLiveStats(id, { hearts, peakViewers, totalViewers }) {
  db.prepare(
    "UPDATE lives SET hearts = ?, peak_viewers = ?, total_viewers = ? WHERE id = ?"
  ).run(hearts, peakViewers, totalViewers, id);
}

/** Marque comme « manqués » les lives programmés jamais démarrés. Retourne le nombre modifié. */
export function markMissedLives() {
  return db
    .prepare("UPDATE lives SET status = 'missed' WHERE status = 'scheduled' AND scheduled_at < ?")
    .run(missedThresholdIso()).changes;
}
