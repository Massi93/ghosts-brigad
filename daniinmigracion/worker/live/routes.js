/**
 * Routes HTTP du live.
 *  - publique : GET /api/live/public/live
 *  - cockpit  : programmation des lives, fin forcée, enregistrements
 */
import { HttpError, json, optionalText, readBinary, requireDate, requireId, requireString } from "../lib/http.js";
import * as live from "./liveService.js";
import { resetReminders } from "../mail/reminders.js";
import { cancelLive, createLive, getLive, listPast, listUpcoming, toAdminLive, updateScheduledLive } from "./livesRepo.js";
import {
  MAX_CHUNK_BYTES,
  appendChunk,
  deleteRecording,
  finishRecording,
  getRecording,
  listRecordings,
  recordingResponse,
  startRecording,
} from "./recordings.js";

/** Valide une date de live : dans le futur et à moins d'un an. */
function validateSchedule(value) {
  const date = requireDate(value, "scheduledAt");
  const now = Date.now();
  if (date.getTime() < now + 60_000) {
    throw new HttpError(400, "La fecha del live debe estar en el futuro", "past_date");
  }
  if (date.getTime() > now + 366 * 86400_000) {
    throw new HttpError(400, "La fecha es demasiado lejana", "too_far");
  }
  return date.toISOString();
}

export function registerPublicLiveRoutes(router) {
  router.add("GET", "/public/live", () => json(live.getPublicStatus()));
}

/** @param {{ onScheduleChanged: () => void }} hooks réveil programmé à recalculer */
export function registerAdminLiveRoutes(router, { onScheduleChanged }) {
  /* ------------------------------ Lives ------------------------------ */

  router.add("GET", "/admin/lives", () =>
    json({
      upcoming: listUpcoming().map(toAdminLive),
      past: listPast().map(toAdminLive),
    })
  );

  router.add("POST", "/admin/lives", ({ body }) => {
    const row = createLive({
      title: requireString(body?.title, "título", { max: 120 }),
      description: optionalText(body?.description, 1000),
      scheduledAt: validateSchedule(body?.scheduledAt),
    });
    live.events.emit("status");
    onScheduleChanged();
    return json({ live: toAdminLive(row) }, 201);
  });

  router.add("PATCH", "/admin/lives/:id", ({ params, body }) => {
    const id = requireId(params.id);
    const current = getLive(id);
    if (!current || current.status !== "scheduled") {
      throw new HttpError(404, "Live programado no encontrado");
    }
    const scheduledAt = body?.scheduledAt === undefined ? current.scheduled_at : validateSchedule(body.scheduledAt);
    const row = updateScheduledLive(id, {
      title: requireString(body?.title ?? current.title, "título", { max: 120 }),
      description: body?.description === undefined ? current.description : optionalText(body.description, 1000),
      scheduledAt,
    });
    if (scheduledAt !== current.scheduled_at) resetReminders(id);
    live.events.emit("status");
    onScheduleChanged();
    return json({ live: toAdminLive(row) });
  });

  router.add("POST", "/admin/lives/:id/cancel", ({ params }) => {
    if (!cancelLive(requireId(params.id))) throw new HttpError(404, "Live programado no encontrado");
    live.events.emit("status");
    onScheduleChanged();
    return json({ ok: true });
  });

  // Terminer le live sans passer par l'onglet qui diffuse (ex. caméra perdue).
  router.add("POST", "/admin/live/end", () => {
    const ended = live.endLive("cockpit");
    if (!ended) throw new HttpError(409, "No hay ningún live en curso");
    return json({ live: ended });
  });

  /* -------------------------- Enregistrements -------------------------- */

  router.add("GET", "/admin/recordings", () => json({ recordings: listRecordings() }));

  router.add("POST", "/admin/recordings", ({ body }) => {
    const liveId = Number(body?.liveId);
    if (!Number.isInteger(liveId)) throw new HttpError(400, "Live inválido");
    const result = startRecording({ liveId, mimeType: body?.mimeType });
    onScheduleChanged();
    return json(result, 201);
  });

  // Morceaux binaires envoyés par MediaRecorder (≈ 2 s de vidéo chacun).
  router.add("POST", "/admin/recordings/:id/chunks", async ({ params, url, request }) => {
    const seq = Number.parseInt(url.searchParams.get("seq"), 10);
    if (!Number.isInteger(seq) || seq < 0) throw new HttpError(400, "Secuencia inválida");
    const body = await readBinary(request, MAX_CHUNK_BYTES);
    return json(await appendChunk(requireId(params.id), seq, body));
  });

  router.add("POST", "/admin/recordings/:id/finish", async ({ params, body }) => {
    const durationMs = Number(body?.durationMs);
    return json({ recording: await finishRecording(requireId(params.id), durationMs) });
  });

  // Lecture (avec support des « Range » pour la barre de progression) ou téléchargement.
  router.add("GET", "/admin/recordings/:id/file", ({ params, url, request }) => {
    const row = getRecording(requireId(params.id));
    if (!row) throw new HttpError(404, "Grabación no encontrada");
    return recordingResponse(row, request, url.searchParams.has("download"));
  });

  router.add("DELETE", "/admin/recordings/:id", async ({ params }) => {
    await deleteRecording(requireId(params.id));
    return json({ ok: true });
  });
}
