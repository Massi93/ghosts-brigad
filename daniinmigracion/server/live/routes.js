/**
 * Routes HTTP du live.
 *  - publique : GET /api/public/live
 *  - cockpit  : programmation des lives, fin forcée, enregistrements
 */
import express, { Router } from "express";
import { HttpError, optionalText, requireDate, requireId, requireString } from "../lib/http.js";
import * as live from "./liveService.js";
import {
  cancelLive,
  createLive,
  getLive,
  listPast,
  listUpcoming,
  toAdminLive,
  updateScheduledLive,
} from "./livesRepo.js";
import {
  appendChunk,
  deleteRecording,
  finishRecording,
  getRecording,
  listRecordings,
  recordingPath,
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

export function publicLiveRouter() {
  const router = Router();
  router.get("/live", (_req, res) => res.json(live.getPublicStatus()));
  return router;
}

export function adminLiveRouter() {
  const router = Router();

  /* ------------------------------ Lives ------------------------------ */

  router.get("/lives", (_req, res) => {
    res.json({
      upcoming: listUpcoming().map(toAdminLive),
      past: listPast().map(toAdminLive),
    });
  });

  router.post("/lives", (req, res) => {
    const row = createLive({
      title: requireString(req.body?.title, "título", { max: 120 }),
      description: optionalText(req.body?.description, 1000),
      scheduledAt: validateSchedule(req.body?.scheduledAt),
    });
    live.events.emit("status");
    res.status(201).json({ live: toAdminLive(row) });
  });

  router.patch("/lives/:id", (req, res) => {
    const id = requireId(req.params.id);
    const current = getLive(id);
    if (!current || current.status !== "scheduled") {
      throw new HttpError(404, "Live programado no encontrado");
    }
    const row = updateScheduledLive(id, {
      title: requireString(req.body?.title ?? current.title, "título", { max: 120 }),
      description:
        req.body?.description === undefined
          ? current.description
          : optionalText(req.body.description, 1000),
      scheduledAt:
        req.body?.scheduledAt === undefined ? current.scheduled_at : validateSchedule(req.body.scheduledAt),
    });
    live.events.emit("status");
    res.json({ live: toAdminLive(row) });
  });

  router.post("/lives/:id/cancel", (req, res) => {
    if (!cancelLive(requireId(req.params.id))) throw new HttpError(404, "Live programado no encontrado");
    live.events.emit("status");
    res.json({ ok: true });
  });

  // Terminer le live sans passer par l'onglet qui diffuse (ex. caméra perdue).
  router.post("/live/end", (_req, res) => {
    const ended = live.endLive("cockpit");
    if (!ended) throw new HttpError(409, "No hay ningún live en curso");
    res.json({ live: ended });
  });

  /* -------------------------- Enregistrements -------------------------- */

  router.get("/recordings", (_req, res) => res.json({ recordings: listRecordings() }));

  router.post("/recordings", (req, res) => {
    const liveId = Number(req.body?.liveId);
    if (!Number.isInteger(liveId)) throw new HttpError(400, "Live inválido");
    res.status(201).json(startRecording({ liveId, mimeType: req.body?.mimeType }));
  });

  // Morceaux binaires envoyés par MediaRecorder (≈ 2 s de vidéo chacun).
  router.post(
    "/recordings/:id/chunks",
    express.raw({ type: "application/octet-stream", limit: "25mb" }),
    async (req, res) => {
      const seq = Number.parseInt(req.query.seq, 10);
      if (!Number.isInteger(seq) || seq < 0) throw new HttpError(400, "Secuencia inválida");
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      res.json(await appendChunk(requireId(req.params.id), seq, body));
    }
  );

  router.post("/recordings/:id/finish", async (req, res) => {
    const durationMs = Number(req.body?.durationMs);
    res.json({ recording: await finishRecording(requireId(req.params.id), durationMs) });
  });

  // Lecture (avec support des « Range » pour la barre de progression) ou téléchargement.
  router.get("/recordings/:id/file", (req, res) => {
    const row = getRecording(requireId(req.params.id));
    if (!row) throw new HttpError(404, "Grabación no encontrada");
    const options = { headers: { "Content-Type": row.mime_type.split(";")[0] } };
    if (req.query.download) {
      return res.download(recordingPath(row), row.filename, options);
    }
    res.sendFile(recordingPath(row), options);
  });

  router.delete("/recordings/:id", async (req, res) => {
    await deleteRecording(requireId(req.params.id));
    res.json({ ok: true });
  });

  return router;
}
