/**
 * Routes du tableau de bord : vue d'ensemble, réglages du site, emails de test.
 */
import { config } from "../config.js";
import { db } from "../db.js";
import { HttpError, html, json, requireEmail, requireId } from "../lib/http.js";
import { getSettings, updateSettings } from "../lib/settings.js";
import * as live from "../live/liveService.js";
import { getNextScheduled, listUpcoming, toAdminLive } from "../live/livesRepo.js";
import { recordingsSummary } from "../live/recordings.js";
import { registrationsSummary } from "../registrations/registrations.js";
import { sendTestEmail } from "../mail/notifications.js";
import { describeMailer, getOutboxMail, listOutbox } from "../mail/mailer.js";
import { usesDocumentedPassword } from "../auth/password.js";

export function registerAdminRoutes(router) {
  router.add("GET", "/admin/overview", () => {
    const lastLive = db.prepare("SELECT * FROM lives WHERE status = 'ended' ORDER BY ended_at DESC LIMIT 1").get();
    const emails = db
      .prepare(
        `SELECT COALESCE(SUM(status = 'sent'), 0) AS sent, COALESCE(SUM(status = 'failed'), 0) AS failed
           FROM email_logs WHERE created_at >= ?`
      )
      .get(new Date(Date.now() - 30 * 86400_000).toISOString());

    return json({
      registrations: registrationsSummary(),
      recordings: recordingsSummary(),
      nextLive: toAdminLive(getNextScheduled()),
      upcomingCount: listUpcoming().length,
      lastLive: toAdminLive(lastLive ?? null),
      emails,
      stats: live.getStats(),
      mail: describeMailer(),
      defaultPassword: usesDocumentedPassword(),
      timezone: config.timezone,
      publicUrl: config.publicUrl,
      serverNow: Date.now(),
    });
  });

  router.add("GET", "/admin/settings", () => json({ settings: getSettings() }));

  router.add("PUT", "/admin/settings", ({ body }) => {
    const patch = {};
    if (typeof body.liveSectionEnabled === "boolean") patch.liveSectionEnabled = body.liveSectionEnabled;
    if (typeof body.liveSectionTitle === "string") {
      const title = body.liveSectionTitle.trim();
      if (!title || title.length > 80) throw new HttpError(400, "Título inválido");
      patch.liveSectionTitle = title;
    }
    if (typeof body.liveSectionText === "string") {
      const text = body.liveSectionText.trim();
      if (text.length > 400) throw new HttpError(400, "Texto demasiado largo");
      patch.liveSectionText = text;
    }
    const settings = updateSettings(patch);
    live.events.emit("status"); // le site se met à jour en direct
    return json({ settings });
  });

  router.add("POST", "/admin/mail/test", async ({ body }) => {
    const result = await sendTestEmail(requireEmail(body?.to));
    if (result.status !== "sent") {
      throw new HttpError(502, `No se pudo enviar: ${result.error}`, "mail_failed");
    }
    return json({ ok: true, mode: config.mail.mode });
  });

  // Mode console : derniers emails « envoyés » (aucun envoi réel).
  router.add("GET", "/admin/mail/outbox", () => json({ mode: config.mail.mode, mails: listOutbox() }));

  router.add("GET", "/admin/mail/outbox/:id", ({ params }) => {
    const mail = getOutboxMail(requireId(params.id));
    if (!mail) throw new HttpError(404, "Correo no encontrado");
    // Affiché dans un iframe isolé (sandbox) du cockpit : aucun script ne s'exécute.
    return html(mail.html, 200, {
      "Content-Security-Policy": "default-src 'none'; img-src * data:; style-src 'unsafe-inline'; sandbox",
    });
  });
}
