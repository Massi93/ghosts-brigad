/**
 * Routes des inscriptions.
 *  - publiques : POST /api/live/public/registrations, /public/unsubscribe, /public/resubscribe
 *  - cockpit   : /api/live/admin/registrations (+ .csv), /admin/notify
 */
import { HttpError, html, ipKey, json, optionalText, requireEmail, requireId, requireString } from "../lib/http.js";
import { createRateLimiter } from "../lib/rateLimit.js";
import { confirmForm, escapeHtml, standalonePage } from "../mail/templates.js";
import { T, normalizeLang } from "../mail/i18n.js";
import { getActiveLive, getNextScheduled } from "../live/livesRepo.js";
import { getBatch, sendConfirmation, sendManualBatch, sendResubscribeRequest } from "../mail/notifications.js";
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

/** Page autonome dans la langue de l'inscrit (espagnol si le lien est invalide). */
function page(row, bodyHtml) {
  return html(standalonePage(normalizeLang(row?.lang), bodyHtml));
}

const invalidLink = () => page(null, `<p>${T.es.invalidLink}</p>`);

export function registerPublicRegistrationRoutes(router) {
  router.add("POST", "/public/registrations", ({ body, ip }) => {
    // Champ piège invisible : rempli uniquement par les robots.
    if (body.website) return json({ ok: true }, 201);

    if (registerLimiter.isBlocked(ipKey(ip))) {
      throw new HttpError(429, "Demasiadas inscripciones. Inténtalo más tarde.", "rate_limited");
    }

    const firstName = requireString(body.firstName, "nombre", { max: 80 });
    const lastName = requireString(body.lastName, "apellido", { max: 80 });
    const email = requireEmail(body.email);
    const lang = normalizeLang(body.lang);
    registerLimiter.hit(ipKey(ip));

    const live = getActiveLive() ?? getNextScheduled();
    const { registration, action } = upsertRegistration({
      firstName,
      lastName,
      email,
      lang,
      liveId: live?.id ?? null,
    });

    // Emails envoyés en arrière-plan : la réponse n'attend pas l'envoi.
    // La réponse est identique dans tous les cas (on ne révèle pas si l'adresse existe).
    const send =
      action === "confirm"
        ? sendConfirmation(registration, live)
        : action === "resubscribe"
          ? sendResubscribeRequest(registration)
          : null;
    send?.catch((err) => console.error("[mail]", err));
    return json({ ok: true, firstName }, 201);
  });

  /*
   * Désinscription (lien de chaque email).
   * GET affiche une confirmation : les antivirus de messagerie qui ouvrent les liens
   * automatiquement ne désinscrivent donc personne. Le POST fait l'action ; il sert
   * aussi au bouton « Se désabonner » natif de Gmail / Outlook (List-Unsubscribe-Post).
   */
  router.add("GET", "/public/unsubscribe", ({ url }) => {
    const row = findByToken(url.searchParams.get("token"));
    if (!row) return invalidLink();
    const t = T[normalizeLang(row.lang)];
    if (row.unsubscribed_at) return page(row, `<p>${t.alreadyUnsubscribed}</p>`);
    return page(row, confirmForm(escapeHtml(t.unsubscribeQuestion(row.first_name)), t.unsubscribeButton));
  });

  router.add("POST", "/public/unsubscribe", ({ url }) => {
    const row = unsubscribeByToken(url.searchParams.get("token"));
    if (!row) return invalidLink();
    return page(row, `<p>${escapeHtml(T[normalizeLang(row.lang)].unsubscribed(row.first_name))}</p>`);
  });

  // Réinscription confirmée par la personne (lien envoyé à une adresse désinscrite).
  router.add("GET", "/public/resubscribe", ({ url }) => {
    const row = findByToken(url.searchParams.get("token"));
    if (!row) return invalidLink();
    const t = T[normalizeLang(row.lang)];
    if (!row.unsubscribed_at) return page(row, `<p>${t.alreadySubscribed}</p>`);
    return page(row, confirmForm(escapeHtml(t.resubscribeQuestion(row.first_name)), t.resubscribeButton));
  });

  router.add("POST", "/public/resubscribe", ({ url }) => {
    const row = resubscribeByToken(url.searchParams.get("token"));
    if (!row) return invalidLink();
    return page(row, `<p>${escapeHtml(T[normalizeLang(row.lang)].resubscribed(row.first_name))}</p>`);
  });
}

export function registerAdminRegistrationRoutes(router) {
  router.add("GET", "/admin/registrations", () => json({ registrations: listRegistrations() }));

  router.add("GET", "/admin/registrations.csv", ({ url }) => {
    const date = new Date().toISOString().slice(0, 10);
    const fr = url.searchParams.get("lang") === "fr";
    return new Response(registrationsCsv(fr ? "fr" : "es"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fr ? "inscrits" : "inscritos"}-live-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  });

  router.add("DELETE", "/admin/registrations/:id", ({ params }) => {
    if (!deleteRegistration(requireId(params.id))) throw new HttpError(404, "Inscrito no encontrado");
    return json({ ok: true });
  });

  // Notification manuelle des inscrits cochés.
  router.add("POST", "/admin/notify", ({ body }) => {
    const ids = Array.isArray(body?.registrationIds) ? body.registrationIds : [];
    const registrationIds = [...new Set(ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
    if (!registrationIds.length) throw new HttpError(400, "Selecciona al menos un destinatario");
    if (registrationIds.length > 5000) throw new HttpError(400, "Demasiados destinatarios");

    const subject = requireString(body?.subject, "asunto", { max: 150 });
    const message = optionalText(body?.message, 10_000);
    if (!message) throw new HttpError(400, "El mensaje no puede estar vacío");

    const live = getActiveLive() ?? getNextScheduled();
    return json(sendManualBatch({ registrationIds, subject, message, liveId: live?.id ?? null }), 202);
  });

  router.add("GET", "/admin/notify/:batchId", ({ params }) => json({ results: getBatch(String(params.batchId)) }));
}
