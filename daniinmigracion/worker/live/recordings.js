/**
 * Enregistrement automatique des lives (stockage Cloudflare R2).
 *
 * Le navigateur de Dani enregistre le flux (MediaRecorder) et envoie un morceau
 * toutes les 2 secondes ; chaque morceau est rangé tel quel dans R2
 * (recordings/<id>/000000, 000001…). Même si l'onglet se ferme brutalement,
 * tout ce qui a été reçu est conservé.
 *
 * À la lecture ou au téléchargement, les morceaux sont renvoyés à la suite
 * comme un seul fichier .webm (ou .mp4 sous Safari), avec le support des
 * requêtes « Range » (barre de progression du lecteur vidéo).
 */
import { db, nowIso } from "../db.js";
import { Emitter } from "../lib/events.js";
import { HttpError } from "../lib/http.js";
import { patchWebmDuration } from "./webmDuration.js";

export const recordingEvents = new Emitter();

/** Bucket R2 (binding RECORDINGS de wrangler.jsonc). */
let bucket = null;

/** Enregistrements en cours : id -> { liveId, mimeType, nextSeq, bytes, startedAt, lastChunkAt, writing } */
const active = new Map();
/** Enregistrements en cours de finalisation (plus aucun morceau accepté). */
const closing = new Set();

export function initRecordings(r2Bucket) {
  bucket = r2Bucket;
  active.clear();
  closing.clear();
  recordingEvents.removeAll();
}

// Un enregistrement sans nouveau morceau depuis ce délai est finalisé automatiquement
// (onglet fermé sans arrêt propre). Aligné sur le délai de grâce d'un live interrompu.
const IDLE_TIMEOUT_MS = 3 * 60_000;
export const MAX_CHUNK_BYTES = 25 * 1024 * 1024;

const ALLOWED_TYPES = [
  { prefix: "video/webm", ext: "webm" },
  { prefix: "video/mp4", ext: "mp4" },
];

const chunkKey = (id, seq) => `recordings/${id}/${String(seq).padStart(6, "0")}`;

function stamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 13);
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

/**
 * Enregistrement en cours. Après un redémarrage du Durable Object, l'état est
 * reconstruit depuis la base : l'envoi des morceaux continue sans coupure.
 */
function getActive(id) {
  if (active.has(id)) return active.get(id);
  if (closing.has(id)) return null;
  const row = getRecording(id);
  if (!row || row.status !== "recording") return null;
  const agg = db
    .prepare("SELECT COALESCE(MAX(seq), -1) AS last, COALESCE(SUM(size), 0) AS bytes FROM recording_chunks WHERE recording_id = ?")
    .get(id);
  const rec = {
    liveId: row.live_id,
    mimeType: row.mime_type,
    nextSeq: agg.last + 1,
    bytes: agg.bytes,
    startedAt: Date.parse(row.created_at),
    lastChunkAt: Date.parse(row.last_chunk_at || row.created_at),
    writing: false,
  };
  active.set(id, rec);
  return rec;
}

/** Ouvre un nouvel enregistrement pour un live. */
export function startRecording({ liveId, mimeType }) {
  const type = ALLOWED_TYPES.find((t) => typeof mimeType === "string" && mimeType.startsWith(t.prefix));
  if (!type) throw new HttpError(400, "Formato de grabación no soportado");
  const live = db.prepare("SELECT id, status FROM lives WHERE id = ?").get(liveId);
  if (!live || live.status !== "live") throw new HttpError(400, "No hay un live en curso");

  // Un seul segment actif par live (une seule caméra diffuse à la fois) : le segment
  // précédent (onglet rechargé, fermé ou repris ailleurs) est finalisé tout de suite.
  const others = db.prepare("SELECT id FROM recordings WHERE live_id = ? AND status = 'recording'").all(liveId);
  for (const { id: otherId } of others) {
    finishRecording(otherId).catch((err) => console.error("[rec]", err));
  }

  const filename = `live-${liveId}-${stamp()}-${Math.random().toString(36).slice(2, 6)}.${type.ext}`;
  const now = nowIso();
  const { lastInsertRowid } = db
    .prepare("INSERT INTO recordings (live_id, filename, mime_type, last_chunk_at) VALUES (?, ?, ?, ?)")
    .run(liveId, filename, mimeType.slice(0, 100), now);
  const id = Number(lastInsertRowid);

  active.set(id, {
    liveId,
    mimeType,
    nextSeq: 0,
    bytes: 0,
    startedAt: Date.now(),
    lastChunkAt: Date.now(),
    writing: false,
  });
  console.log(`[rec] Enregistrement #${id} démarré → ${filename}`);
  recordingEvents.emit("changed");
  return { id, filename };
}

/**
 * Ajoute un morceau. Les morceaux doivent arriver dans l'ordre (`seq` = 0, 1, 2…).
 * Un morceau déjà reçu (renvoi après une erreur réseau) est ignoré sans erreur.
 * Après une erreur d'écriture, l'enregistrement est marqué « cassé » et les morceaux
 * suivants sont refusés : le navigateur démarre alors un nouveau segment.
 */
export async function appendChunk(id, seq, buffer) {
  const rec = getActive(id);
  if (!rec) throw new HttpError(404, "Grabación cerrada", "recording_closed");
  if (rec.broken) throw new HttpError(409, "Grabación interrumpida", "recording_broken");
  if (seq < rec.nextSeq) return { bytes: rec.bytes, duplicate: true };
  if (seq > rec.nextSeq || rec.writing) {
    throw new HttpError(409, `Fragmento fuera de orden (esperado ${rec.nextSeq})`, "out_of_order");
  }
  rec.writing = true;
  try {
    if (buffer.byteLength > 0) await bucket.put(chunkKey(id, seq), buffer);
    // Le morceau n'est compté qu'une fois réellement enregistré dans R2.
    const now = nowIso();
    db.transaction(() => {
      db.prepare("INSERT OR REPLACE INTO recording_chunks (recording_id, seq, size) VALUES (?, ?, ?)").run(
        id,
        seq,
        buffer.byteLength
      );
      db.prepare("UPDATE recordings SET size_bytes = size_bytes + ?, last_chunk_at = ? WHERE id = ?").run(
        buffer.byteLength,
        now,
        id
      );
    })();
    rec.nextSeq += 1;
    rec.bytes += buffer.byteLength;
    rec.lastChunkAt = Date.now();
  } catch (err) {
    rec.broken = true;
    console.error(`[rec] Écriture impossible pour #${id} :`, err?.message || err);
    throw new HttpError(409, "No se pudo escribir la grabación", "recording_broken");
  } finally {
    rec.writing = false;
  }
  return { bytes: rec.bytes };
}

/** Écrit la durée dans l'en-tête WebM (premier morceau non vide). */
async function fixDuration(id, durationMs) {
  const first = db
    .prepare("SELECT seq, size FROM recording_chunks WHERE recording_id = ? AND size > 0 ORDER BY seq LIMIT 1")
    .get(id);
  if (!first) return;
  const object = await bucket.get(chunkKey(id, first.seq));
  if (!object) return;
  const patched = patchWebmDuration(new Uint8Array(await object.arrayBuffer()), durationMs);
  if (!patched) return;
  await bucket.put(chunkKey(id, first.seq), patched);
  db.prepare("UPDATE recording_chunks SET size = ? WHERE recording_id = ? AND seq = ?").run(
    patched.byteLength,
    id,
    first.seq
  );
}

/** Ferme l'enregistrement, corrige la durée (WebM) et le marque comme prêt. */
export async function finishRecording(id, durationMs) {
  const rec = getActive(id);
  if (!rec) {
    const row = getRecording(id);
    if (row) return toRecordingDto(row); // déjà finalisé (ou en cours de finalisation)
    throw new HttpError(404, "Grabación no encontrada");
  }
  active.delete(id);
  closing.add(id);
  try {
    // Attend la fin d'un morceau en cours d'écriture.
    for (let i = 0; rec.writing && i < 100; i += 1) await new Promise((r) => setTimeout(r, 100));

    // Durée fournie par le navigateur, sinon estimée avec les horodatages serveur.
    const estimated = Math.max(0, rec.lastChunkAt - rec.startedAt);
    const duration = Number.isFinite(durationMs) && durationMs > 0 ? Math.round(durationMs) : estimated;

    try {
      if (rec.mimeType.startsWith("video/webm")) await fixDuration(id, duration);
    } catch (err) {
      console.warn(`[rec] Durée non corrigée pour #${id} :`, err?.message || err);
    }
    const { size } = db
      .prepare("SELECT COALESCE(SUM(size), 0) AS size FROM recording_chunks WHERE recording_id = ?")
      .get(id);
    const status = size > 0 ? "ready" : "failed";
    db.prepare(
      "UPDATE recordings SET status = ?, size_bytes = ?, duration_ms = ?, finished_at = ? WHERE id = ?"
    ).run(status, size, duration, nowIso(), id);

    console.log(`[rec] Enregistrement #${id} ${status === "ready" ? "sauvegardé" : "en échec"} (${(size / 1e6).toFixed(1)} Mo).`);
    recordingEvents.emit("changed");
    return toRecordingDto(getRecording(id));
  } finally {
    closing.delete(id);
  }
}

/** Finalise tous les enregistrements d'un live (fin du live, délai de grâce expiré). */
export async function finishAllForLive(liveId) {
  const rows = db.prepare("SELECT id FROM recordings WHERE live_id = ? AND status = 'recording'").all(liveId);
  await Promise.all(rows.map(({ id }) => finishRecording(id).catch(() => {})));
}

/** Finalise les enregistrements inactifs (onglet fermé sans arrêt propre). */
export async function sweepIdleRecordings() {
  const limit = new Date(Date.now() - IDLE_TIMEOUT_MS).toISOString();
  const rows = db
    .prepare("SELECT id FROM recordings WHERE status = 'recording' AND COALESCE(last_chunk_at, created_at) < ?")
    .all(limit);
  for (const { id } of rows) {
    if (active.get(id)?.writing) continue;
    console.log(`[rec] Enregistrement #${id} inactif : finalisation automatique.`);
    await finishRecording(id).catch((err) => console.error("[rec]", err));
  }
}

/** `true` si un enregistrement est encore ouvert (le réveil programmé le surveille). */
export function hasOpenRecordings() {
  return Boolean(db.prepare("SELECT 1 FROM recordings WHERE status = 'recording' LIMIT 1").get());
}

/** Supprime un enregistrement et tous ses morceaux dans R2. */
export async function deleteRecording(id) {
  if (getActive(id) || closing.has(id)) throw new HttpError(409, "La grabación sigue en curso");
  const row = getRecording(id);
  if (!row) throw new HttpError(404, "Grabación no encontrada");
  const keys = db
    .prepare("SELECT seq FROM recording_chunks WHERE recording_id = ? AND size > 0")
    .all(id)
    .map(({ seq }) => chunkKey(id, seq));
  for (let i = 0; i < keys.length; i += 1000) await bucket.delete(keys.slice(i, i + 1000));
  db.prepare("DELETE FROM recordings WHERE id = ?").run(id);
  recordingEvents.emit("changed");
}

/** Statistiques pour le tableau de bord. */
export function recordingsSummary() {
  return db
    .prepare("SELECT COUNT(*) AS count, COALESCE(SUM(size_bytes), 0) AS bytes FROM recordings WHERE status = 'ready'")
    .get();
}

/* ------------------------- Lecture / téléchargement ------------------------- */

/** Analyse un en-tête `Range: bytes=…` (une seule plage). */
function parseRange(header, total) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header || "").trim());
  if (!m || (!m[1] && !m[2])) return null;
  let start;
  let end;
  if (!m[1]) {
    const suffix = Number(m[2]);
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else {
    start = Number(m[1]);
    end = m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
  }
  if (start > end || start >= total) return { invalid: true };
  return { start, end };
}

/**
 * Réponse HTTP avec le fichier complet (morceaux R2 mis bout à bout).
 * @param {object} row ligne `recordings`
 * @param {Request} request (en-tête Range éventuel)
 * @param {boolean} download `Content-Disposition: attachment`
 */
export function recordingResponse(row, request, download) {
  const chunks = db
    .prepare("SELECT seq, size FROM recording_chunks WHERE recording_id = ? AND size > 0 ORDER BY seq")
    .all(row.id);
  const total = chunks.reduce((n, c) => n + c.size, 0);
  const headers = {
    "Content-Type": row.mime_type.split(";")[0],
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${row.filename}"`,
  };

  const range = request.headers.has("range") ? parseRange(request.headers.get("range"), total) : null;
  if (range?.invalid) {
    return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${total}` } });
  }
  const start = range ? range.start : 0;
  const end = range ? range.end : total - 1;
  const length = total ? end - start + 1 : 0;
  if (range) headers["Content-Range"] = `bytes ${start}-${end}/${total}`;

  if (request.method === "HEAD" || length === 0) {
    return new Response(null, { status: range ? 206 : 200, headers: { ...headers, "Content-Length": String(length) } });
  }

  // Les morceaux concernés par la plage sont lus dans l'ordre et envoyés en flux.
  const { readable, writable } = new FixedLengthStream(length);
  (async () => {
    let offset = 0;
    try {
      for (const chunk of chunks) {
        const chunkStart = offset;
        const chunkEnd = offset + chunk.size - 1;
        offset += chunk.size;
        if (chunkEnd < start) continue;
        if (chunkStart > end) break;
        const from = Math.max(start, chunkStart) - chunkStart;
        const to = Math.min(end, chunkEnd) - chunkStart;
        const object = await bucket.get(chunkKey(row.id, chunk.seq), {
          range: { offset: from, length: to - from + 1 },
        });
        if (!object) throw new Error(`morceau ${chunk.seq} introuvable`);
        await object.body.pipeTo(writable, { preventClose: true });
      }
      await writable.close();
    } catch (err) {
      console.error(`[rec] Lecture interrompue (#${row.id}) :`, err?.message || err);
      await writable.abort(err).catch(() => {});
    }
  })();
  return new Response(readable, { status: range ? 206 : 200, headers });
}
