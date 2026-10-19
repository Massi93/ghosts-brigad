/**
 * Routes du tableau de bord : vue d'ensemble, réglages du site, email de test.
 */
import { Router } from "express";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { HttpError, requireEmail } from "../lib/http.js";
import { getSettings, updateSettings } from "../lib/settings.js";
import * as live from "../live/liveService.js";
import { getNextScheduled, listUpcoming, toAdminLive } from "../live/livesRepo.js";
import { recordingsSummary } from "../live/recordings.js";
import { registrationsSummary } from "../registrations/registrations.js";
import { sendTestEmail } from "../mail/notifications.js";

export function adminRouter() {
  const router = Router();

  router.get("/overview", (_req, res) => {
    const lastLive = db
      .prepare("SELECT * FROM lives WHERE status = 'ended' ORDER BY ended_at DESC LIMIT 1")
      .get();
    const emails = db
      .prepare(
        `SELECT COALESCE(SUM(status = 'sent'), 0) AS sent, COALESCE(SUM(status = 'failed'), 0) AS failed
           FROM email_logs WHERE created_at >= ?`
      )
      .get(new Date(Date.now() - 30 * 86400_000).toISOString());

    res.json({
      registrations: registrationsSummary(),
      recordings: recordingsSummary(),
      nextLive: toAdminLive(getNextScheduled()),
      upcomingCount: listUpcoming().length,
      lastLive: toAdminLive(lastLive),
      emails,
      stats: live.getStats(),
      mail: { mode: config.mail.mode, from: config.mail.from, host: config.mail.smtp.host || null },
      timezone: config.timezone,
      publicUrl: config.publicUrl,
      serverNow: Date.now(),
    });
  });

  router.get("/settings", (_req, res) => res.json({ settings: getSettings() }));

  router.put("/settings", (req, res) => {
    const body = req.body ?? {};
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
    res.json({ settings });
  });

  router.post("/mail/test", async (req, res) => {
    const result = await sendTestEmail(requireEmail(req.body?.to));
    if (result.status !== "sent") {
      throw new HttpError(502, `No se pudo enviar: ${result.error}`, "mail_failed");
    }
    res.json({ ok: true, mode: config.mail.mode });
  });

  return router;
}
