/**
 * Enregistrement automatique des lives.
 *
 * Le navigateur de Dani enregistre le flux (MediaRecorder) et envoie un morceau
 * toutes les 2 secondes ; le serveur les ajoute au fichier au fur et à mesure.
 * Avantage : même si l'onglet se ferme brutalement, tout ce qui a été reçu est conservé.
 *
 * Fichiers : storage/recordings/live-<id>-<date>.webm (ou .mp4 sous Safari)
 */
import fs from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";
import { config } from "../config.js";
import { db, nowIso } from "../db/index.js";
import { HttpError } from "../lib/http.js";
import { fixWebmDuration } from "./webmDuration.js";

export const recordingEvents = new EventEmitter();

/** Enregistrements en cours : id -> { liveId, stream, nextSeq, bytes, startedAt, lastChunkAt } */
const active = new Map();

// Un enregistrement sans nouveau morceau depuis ce délai est finalisé automatiquement.
const IDLE_TIMEOUT_MS = 60_000;

const ALLOWED_TYPES = [
  { prefix: "video/webm", ext: "webm" },
  { prefix: "video/mp4", ext: "mp4" },
];

function dir() {
  fs.mkdirSync(config.paths.recordings, { recursive: true });
  return config.paths.recordings;
}

function stamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
}

export function toRecordingDto(row) {
  return {
    id: row.id,
    liveId: row.live_id,
    liveTitle: row.live_title ?? null,
    filename: row.filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    durationMs: row.duration_ms,
    status: row.status,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  };
}

export function listRecordings() {
  return db
    .prepare(
      `SELECT r.*, l.title AS live_title FROM recordings r
         LEFT JOIN lives l ON l.id = r.live_id
        ORDER BY r.created_at DESC`
    )
    .all()
    .map(toRecordingDto);
}

export function getRecording(id) {
  return db.prepare("SELECT * FROM recordings WHERE id = ?").get(id) ?? null;
}

/** Chemin absolu du fichier (le nom vient de la base, jamais de l'utilisateur). */
export function recordingPath(row) {
  return path.join(config.paths.recordings, path.basename(row.filename));
}

/** Ouvre un nouveau fichier d'enregistrement pour un live. */
export function startRecording({ liveId, mimeType }) {
  const type = ALLOWED_TYPES.find((t) => typeof mimeType === "string" && mimeType.startsWith(t.prefix));
  if (!type) throw new HttpError(400, "Formato de grabación no soportado");
  const live = db.prepare("SELECT id, status FROM lives WHERE id = ?").get(liveId);
  if (!live || live.status !== "live") throw new HttpError(400, "No hay un live en curso");

  const filename = `live-${liveId}-${stamp()}-${Math.random().toString(36).slice(2, 6)}.${type.ext}`;
  const file = path.join(dir(), filename);
  const stream = fs.createWriteStream(file, { flags: "wx" });
  stream.on("error", (err) => console.error(`[rec] Erreur d'écriture ${filename} :`, err));

  const { lastInsertRowid: id } = db
    .prepare("INSERT INTO recordings (live_id, filename, mime_type) VALUES (?, ?, ?)")
    .run(liveId, filename, mimeType.slice(0, 100));

  active.set(Number(id), {
    liveId,
    stream,
    file,
    mimeType,
    nextSeq: 0,
    bytes: 0,
    startedAt: Date.now(),
    lastChunkAt: Date.now(),
  });
  console.log(`[rec] Enregistrement #${id} démarré → ${filename}`);
  recordingEvents.emit("changed");
  return { id: Number(id), filename };
}

/**
 * Ajoute un morceau. Les morceaux doivent arriver dans l'ordre (`seq` = 0, 1, 2…).
 * Un morceau déjà reçu (renvoi après une erreur réseau) est ignoré sans erreur.
 */
export async function appendChunk(id, seq, buffer) {
  const rec = active.get(id);
  if (!rec) throw new HttpError(404, "Grabación cerrada", "recording_closed");
  if (seq < rec.nextSeq) return { bytes: rec.bytes, duplicate: true };
  if (seq > rec.nextSeq) {
    throw new HttpError(409, `Fragmento fuera de orden (esperado ${rec.nextSeq})`, "out_of_order");
  }
  rec.nextSeq += 1;
  rec.lastChunkAt = Date.now();
  if (buffer.length > 0) {
    await new Promise((resolve, reject) =>
      rec.stream.write(buffer, (err) => (err ? reject(err) : resolve()))
    );
    rec.bytes += buffer.length;
  }
  return { bytes: rec.bytes };
}

/** Ferme le fichier, corrige la durée (WebM) et marque l'enregistrement comme prêt. */
export async function finishRecording(id, durationMs) {
  const rec = active.get(id);
  if (!rec) {
    const row = getRecording(id);
    if (row) return toRecordingDto(row); // déjà finalisé
    throw new HttpError(404, "Grabación no encontrada");
  }
  active.delete(id);

  await new Promise((resolve) => rec.stream.end(resolve));

  // Durée fournie par le navigateur, sinon estimée avec les horodatages serveur.
  const estimated = rec.lastChunkAt - rec.startedAt;
  const duration =
    Number.isFinite(durationMs) && durationMs > 0 ? Math.round(durationMs) : estimated;

  let status = "ready";
  try {
    if (rec.mimeType.startsWith("video/webm")) await fixWebmDuration(rec.file, duration);
  } catch (err) {
    console.warn(`[rec] Durée non corrigée pour #${id} :`, err.message);
  }
  let size = 0;
  try {
    size = (await fs.promises.stat(rec.file)).size;
  } catch {
    status = "failed";
  }
  if (size === 0) status = "failed";

  db.prepare(
    `UPDATE recordings SET status = ?, size_bytes = ?, duration_ms = ?, finished_at = ? WHERE id = ?`
  ).run(status, size, duration, nowIso(), id);

  console.log(`[rec] Enregistrement #${id} ${status === "ready" ? "sauvegardé" : "en échec"} (${(size / 1e6).toFixed(1)} Mo).`);
  recordingEvents.emit("changed");
  return toRecordingDto(getRecording(id));
}

/** Finalise tous les enregistrements d'un live (fin du live, délai de grâce expiré). */
export async function finishAllForLive(liveId) {
  const ids = [...active].filter(([, rec]) => rec.liveId === liveId).map(([id]) => id);
  await Promise.all(ids.map((id) => finishRecording(id).catch(() => {})));
}

/** Finalise tous les enregistrements ouverts (arrêt du serveur). */
export async function finishAllActive() {
  await Promise.all([...active.keys()].map((id) => finishRecording(id).catch(() => {})));
}

export async function deleteRecording(id) {
  if (active.has(id)) throw new HttpError(409, "La grabación sigue en curso");
  const row = getRecording(id);
  if (!row) throw new HttpError(404, "Grabación no encontrada");
  await fs.promises.rm(recordingPath(row), { force: true });
  db.prepare("DELETE FROM recordings WHERE id = ?").run(id);
  recordingEvents.emit("changed");
}

/** Statistiques pour le tableau de bord. */
export function recordingsSummary() {
  return db
    .prepare(
      "SELECT COUNT(*) AS count, COALESCE(SUM(size_bytes), 0) AS bytes FROM recordings WHERE status = 'ready'"
    )
    .get();
}

/**
 * Au démarrage : les enregistrements restés « en cours » (serveur arrêté pendant
 * un live) sont récupérés tels quels.
 */
export function recoverInterruptedRecordings() {
  const rows = db.prepare("SELECT * FROM recordings WHERE status = 'recording'").all();
  for (const row of rows) {
    let size = 0;
    try {
      size = fs.statSync(recordingPath(row)).size;
    } catch {
      // fichier absent
    }
    db.prepare(
      "UPDATE recordings SET status = ?, size_bytes = ?, finished_at = ? WHERE id = ?"
    ).run(size > 0 ? "ready" : "failed", size, nowIso(), row.id);
  }
  if (rows.length) console.log(`[rec] ${rows.length} enregistrement(s) interrompu(s) récupéré(s).`);
}

/** Finalise les enregistrements inactifs (onglet fermé sans arrêt propre). */
export function startIdleSweeper() {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [id, rec] of active) {
      if (now - rec.lastChunkAt > IDLE_TIMEOUT_MS) {
        console.log(`[rec] Enregistrement #${id} inactif : finalisation automatique.`);
        finishRecording(id).catch((err) => console.error("[rec]", err));
      }
    }
  }, 10_000);
  timer.unref();
}
