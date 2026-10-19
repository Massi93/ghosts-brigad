/**
 * Routes des inscriptions.
 *  - publiques : POST /api/public/registrations, GET /api/public/unsubscribe
 *  - cockpit   : /api/admin/registrations (+ .csv), /api/admin/notify
 */
import { Router } from "express";
import { clientIp, HttpError, optionalText, requireEmail, requireId, requireString } from "../lib/http.js";
import { createRateLimiter } from "../lib/rateLimit.js";
import { escapeHtml } from "../mail/templates.js";
import { getActiveLive, getNextScheduled } from "../live/livesRepo.js";
import { getBatch, sendConfirmation, sendManualBatch } from "../mail/notifications.js";
import {
  deleteRegistration,
  listRegistrations,
  registrationsCsv,
  unsubscribeByToken,
  upsertRegistration,
} from "./registrations.js";

// 10 inscriptions max par IP et par heure (anti-spam).
const registerLimiter = createRateLimiter({ max: 10, windowMs: 3600_000 });

export function publicRegistrationsRouter() {
  const router = Router();

  router.post("/registrations", (req, res) => {
    const body = req.body ?? {};
    // Champ piège invisible : rempli uniquement par les robots.
    if (body.website) return res.json({ ok: true });

    const ip = clientIp(req);
    if (registerLimiter.isBlocked(ip)) {
      throw new HttpError(429, "Demasiadas inscripciones. Inténtalo más tarde.", "rate_limited");
    }

    const firstName = requireString(body.firstName, "nombre", { max: 80 });
    const lastName = requireString(body.lastName, "apellido", { max: 80 });
    const email = requireEmail(body.email);
    registerLimiter.hit(ip);

    const live = getActiveLive() ?? getNextScheduled();
    const { registration, shouldConfirm } = upsertRegistration({
      firstName,
      lastName,
      email,
      liveId: live?.id ?? null,
    });

    // Confirmation envoyée en arrière-plan : la réponse n'attend pas le SMTP.
    if (shouldConfirm) {
      sendConfirmation(registration, live).catch((err) => console.error("[mail]", err));
    }
    res.status(201).json({ ok: true, firstName });
  });

  // Lien « Darme de baja » présent dans chaque email.
  router.get("/unsubscribe", (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const row = token ? unsubscribeByToken(token) : null;
    const message = row
      ? `Listo, ${escapeHtml(row.first_name)}. Ya no recibirás más avisos de los lives.`
      : "Este enlace no es válido o ya fue utilizado.";
    res.type("html").send(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Baja · Dani Inmigración</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1220;color:#e5e9f5;font-family:system-ui,sans-serif;padding:24px">
<main style="max-width:420px;text-align:center"><h1 style="font-size:22px">Dani<span style="color:#8eacff">Inmigración</span></h1>
<p>${message}</p><p><a href="/" style="color:#8eacff">Volver al sitio</a></p></main></body></html>`);
  });

  return router;
}

export function adminRegistrationsRouter() {
  const router = Router();

  router.get("/registrations", (_req, res) => {
    res.json({ registrations: listRegistrations() });
  });

  router.get("/registrations.csv", (_req, res) => {
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="inscritos-live-${date}.csv"`);
    res.send(registrationsCsv());
  });

  router.delete("/registrations/:id", (req, res) => {
    if (!deleteRegistration(requireId(req.params.id))) throw new HttpError(404, "Inscrito no encontrado");
    res.json({ ok: true });
  });

  // Notification manuelle des inscrits cochés.
  router.post("/notify", (req, res) => {
    const ids = Array.isArray(req.body?.registrationIds) ? req.body.registrationIds : [];
    const registrationIds = [...new Set(ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
    if (!registrationIds.length) throw new HttpError(400, "Selecciona al menos un destinatario");
    if (registrationIds.length > 5000) throw new HttpError(400, "Demasiados destinatarios");

    const subject = requireString(req.body?.subject, "asunto", { max: 150 });
    const message = optionalText(req.body?.message, 10_000);
    if (!message) throw new HttpError(400, "El mensaje no puede estar vacío");

    const live = getActiveLive() ?? getNextScheduled();
    res.status(202).json(sendManualBatch({ registrationIds, subject, message, liveId: live?.id ?? null }));
  });

  router.get("/notify/:batchId", (req, res) => {
    res.json({ results: getBatch(String(req.params.batchId)) });
  });

  return router;
}
