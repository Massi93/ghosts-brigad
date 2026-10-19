/**
 * Routes des inscriptions.
 *  - publiques : POST /api/public/registrations, /api/public/unsubscribe, /api/public/resubscribe
 *  - cockpit   : /api/admin/registrations (+ .csv), /api/admin/notify
 */
import { Router } from "express";
import { clientIp, HttpError, optionalText, requireEmail, requireId, requireString } from "../lib/http.js";
import { createRateLimiter } from "../lib/rateLimit.js";
import { escapeHtml } from "../mail/templates.js";
import { getActiveLive, getNextScheduled } from "../live/livesRepo.js";
import {
  getBatch,
  sendConfirmation,
  sendManualBatch,
  sendResubscribeRequest,
} from "../mail/notifications.js";
import {
  deleteRegistration,
  findByToken,
  listRegistrations,
  registrationsCsv,
  resubscribeByToken,
  unsubscribeByToken,
  upsertRegistration,
} from "./registrations.js";

// 10 inscriptions max par IP et par heure (anti-spam).
const registerLimiter = createRateLimiter({ max: 10, windowMs: 3600_000 });

/** Petite page HTML autonome (désinscription / réinscription). */
function page(res, bodyHtml) {
  res.type("html").send(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Avisos · Dani Inmigración</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1220;color:#e5e9f5;font-family:system-ui,sans-serif;padding:24px">
<main style="max-width:420px;text-align:center"><h1 style="font-size:22px">Dani<span style="color:#8eacff">Inmigración</span></h1>
${bodyHtml}<p style="margin-top:24px"><a href="/" style="color:#8eacff">Volver al sitio</a></p></main></body></html>`);
}

/** Formulaire de confirmation : l'action n'est faite qu'au clic (POST). */
function confirmForm(question, button) {
  return `<p>${question}</p>
<form method="post"><button type="submit" style="margin-top:8px;padding:12px 22px;border:0;border-radius:12px;background:#3358f4;color:#fff;font-weight:700;font-size:15px;cursor:pointer">${button}</button></form>`;
}

const INVALID_LINK = "<p>Este enlace no es válido.</p>";

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
    const { registration, action } = upsertRegistration({
      firstName,
      lastName,
      email,
      liveId: live?.id ?? null,
    });

    // Emails envoyés en arrière-plan : la réponse n'attend pas le SMTP.
    // La réponse est identique dans tous les cas (on ne révèle pas si l'adresse existe).
    const send =
      action === "confirm"
        ? sendConfirmation(registration, live)
        : action === "resubscribe"
          ? sendResubscribeRequest(registration)
          : null;
    send?.catch((err) => console.error("[mail]", err));
    res.status(201).json({ ok: true, firstName });
  });

  /*
   * Désinscription (lien « Darme de baja » de chaque email).
   * GET affiche une confirmation : les antivirus de messagerie qui ouvrent les liens
   * automatiquement ne désinscrivent donc personne. Le POST fait l'action ; il sert
   * aussi au bouton « Se désabonner » natif de Gmail / Outlook (List-Unsubscribe-Post).
   */
  router.get("/unsubscribe", (req, res) => {
    const row = findByToken(req.query.token);
    if (!row) return page(res, INVALID_LINK);
    if (row.unsubscribed_at) return page(res, "<p>Ya no recibes los avisos de los lives.</p>");
    page(res, confirmForm(`${escapeHtml(row.first_name)}, ¿quieres dejar de recibir los avisos de los lives?`, "Sí, darme de baja"));
  });

  router.post("/unsubscribe", (req, res) => {
    const row = unsubscribeByToken(req.query.token);
    if (!row) return page(res, INVALID_LINK);
    page(res, `<p>Listo, ${escapeHtml(row.first_name)}. Ya no recibirás más avisos de los lives.</p>`);
  });

  // Réinscription confirmée par la personne (lien envoyé à une adresse désinscrite).
  router.get("/resubscribe", (req, res) => {
    const row = findByToken(req.query.token);
    if (!row) return page(res, INVALID_LINK);
    if (!row.unsubscribed_at) return page(res, "<p>Ya estás inscrito/a: recibirás los avisos de los lives.</p>");
    page(res, confirmForm(`${escapeHtml(row.first_name)}, ¿quieres volver a recibir los avisos de los lives?`, "Sí, volver a inscribirme"));
  });

  router.post("/resubscribe", (req, res) => {
    const row = resubscribeByToken(req.query.token);
    if (!row) return page(res, INVALID_LINK);
    page(res, `<p>¡Bienvenido/a de nuevo, ${escapeHtml(row.first_name)}! Recibirás los avisos de los próximos lives.</p>`);
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
