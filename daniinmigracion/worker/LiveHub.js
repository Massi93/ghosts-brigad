/**
 * Durable Object « LiveHub » : le cœur du serveur Live.
 *
 * Une seule instance existe (nommée "main"). Elle garde en mémoire l'état du
 * direct (caméra de Dani, viewers, cœurs), accepte les WebSockets, répond à
 * l'API /api/live/* et possède sa propre base SQLite (stockage Cloudflare).
 * Une alarme la réveille aux bons moments : rappels par email, fin d'un live
 * interrompu, finalisation des enregistrements abandonnés.
 */
import { DurableObject } from "cloudflare:workers";
import { config, loadConfig } from "./config.js";
import { openDatabase } from "./db.js";
import {
  HttpError,
  SECURITY_HEADERS,
  clientIp,
  createRouter,
  discardBody,
  errorResponse,
  isOwnOrigin,
  json,
  readJson,
} from "./lib/http.js";
import { initAdminPassword } from "./auth/password.js";
import { findSession, purgeExpiredSessions, sessionFromRequest } from "./auth/sessions.js";
import { registerAuthRoutes } from "./auth/routes.js";
import { registerAdminRoutes } from "./admin/routes.js";
import { registerAdminLiveRoutes, registerPublicLiveRoutes } from "./live/routes.js";
import { registerAdminRegistrationRoutes, registerPublicRegistrationRoutes } from "./registrations/routes.js";
import { setupSockets } from "./live/sockets.js";
import * as live from "./live/liveService.js";
import { hasOpenRecordings, initRecordings, sweepIdleRecordings } from "./live/recordings.js";
import { refreshIceServers } from "./live/iceServers.js";
import { locateRequest } from "./live/geo.js";
import { initMailer, pendingMailCount } from "./mail/mailer.js";
import { failInterruptedMails, mailEvents } from "./mail/notifications.js";
import { checkReminders, nextReminderCheck } from "./mail/reminders.js";

const API_PREFIX = "/api/live";
const HOUSEKEEPING_MS = 60_000; // vérifications pendant un live ou un enregistrement

export class LiveHub extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    loadConfig(env);
    openDatabase(ctx.storage);
    // Nouvelle instance : l'état mémoire d'une éventuelle instance précédente est effacé.
    live.resetRuntimeState();
    mailEvents.removeAll();
    initRecordings(env.RECORDINGS);
    initMailer();

    this.sockets = setupSockets();
    this.router = this.buildRouter();
    this.lastPurge = 0;
    this.ticking = null;

    // Progression des envois d'emails manuels → cockpit en temps réel.
    mailEvents.on("progress", (data) => this.sockets.emitToCockpit("mail:progress", data));
    mailEvents.on("done", (data) => this.sockets.emitToCockpit("mail:done", data));
    // Tout changement d'état peut avancer ou retarder le prochain réveil.
    live.events.on("status", () => this.scheduleAlarm());
    live.events.on("schedule", () => this.scheduleAlarm());

    ctx.blockConcurrencyWhile(async () => {
      await initAdminPassword();
      purgeExpiredSessions();
      const interrupted = failInterruptedMails();
      if (interrupted) console.warn(`[mail] ${interrupted} email(s) interrompu(s) par le redémarrage`);
      live.restoreAfterRestart();
      await this.scheduleAlarm();
    });
    refreshIceServers(); // relais TURN Cloudflare si configurés (sans bloquer)
  }

  /* ------------------------------ Routes API ------------------------------ */

  buildRouter() {
    const router = createRouter();
    registerAuthRoutes(router, { onLogout: (tokenHash) => this.sockets.disconnectSession(tokenHash) });
    registerPublicLiveRoutes(router);
    registerPublicRegistrationRoutes(router);
    registerAdminRoutes(router);
    // Live créé, déplacé ou annulé : passage immédiat (rappel « 3 h » si l'on est déjà dans la fenêtre).
    registerAdminLiveRoutes(router, { onScheduleChanged: () => this.ctx.waitUntil(this.tick()) });
    registerAdminRegistrationRoutes(router);
    return router;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.startsWith(API_PREFIX) ? url.pathname.slice(API_PREFIX.length) || "/" : url.pathname;
    try {
      if (path === "/ws/live" || path === "/ws/cockpit") return await this.handleWebSocket(request, path);
      const response = await this.handleApi(request, url, path);
      return withHeaders(response, SECURITY_HEADERS);
    } catch (err) {
      return withHeaders(errorResponse(err), SECURITY_HEADERS);
    } finally {
      // Requête refusée sans lire son corps (403, 404, 429…) : on l'abandonne proprement.
      discardBody(request);
    }
  }

  async handleApi(request, url, path) {
    const method = request.method;

    // Protection CSRF complémentaire au cookie SameSite=Strict : toute requête
    // qui modifie des données doit venir du site lui-même.
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      const origin = request.headers.get("origin");
      if (origin && !isOwnOrigin(origin, request)) {
        return json({ error: "Origen no permitido", code: "bad_origin" }, 403);
      }
    }

    const match = this.router.match(method, path);
    if (!match) return json({ error: "No encontrado" }, 404);
    if (match.methodNotAllowed) return json({ error: "Método no permitido" }, 405);

    const session = await sessionFromRequest(request);
    if (path.startsWith("/admin/") && !session) {
      return json({ error: "No autorizado", code: "unauthorized" }, 401);
    }

    const isJson = (request.headers.get("content-type") || "").includes("application/json");
    const body = isJson && ["POST", "PUT", "PATCH", "DELETE"].includes(method) ? await readJson(request) : {};
    return match.handler({
      request,
      url,
      params: match.params,
      body: body && typeof body === "object" ? body : {},
      session,
      ip: clientIp(request),
    });
  }

  async handleWebSocket(request, path) {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      throw new HttpError(426, "Se esperaba un WebSocket");
    }
    const ip = clientIp(request);
    const info = { ip, userAgent: request.headers.get("user-agent") || "", geo: locateRequest(request, ip) };
    if (path === "/ws/live") return this.sockets.acceptPublic(info);

    // Cockpit : le cookie seul ne suffit pas, la page doit venir du site lui-même.
    const origin = request.headers.get("origin");
    const session = origin && !isOwnOrigin(origin, request) ? null : await sessionFromRequest(request);
    if (!session) return this.sockets.rejectCockpit(info);
    return this.sockets.acceptCockpit({ ...info, session });
  }

  /* --------------------- Appels directs depuis le Worker --------------------- */

  /** Le cookie correspond-il à une session valide ? (protection des pages /cockpit) */
  async isLoggedIn(cookieHeader) {
    const token = readSessionToken(cookieHeader);
    return Boolean(token && (await findSession(token)));
  }

  /* ------------------------------ Réveils ------------------------------ */

  /**
   * Programme le prochain réveil (alarme Cloudflare) selon ce qui reste à faire.
   *
   * Une alarme déjà prévue plus tôt (ou déjà échue) est gardée : la repousser l'annulerait,
   * et une nouvelle instance qui démarre pour la traiter la décalerait sans fin. Seul
   * `tick()` (`force`), qui vient de tout traiter, remplace ou supprime l'alarme.
   */
  scheduleAlarm({ force = false } = {}) {
    this.alarmUpdate = (this.alarmUpdate ?? Promise.resolve())
      .then(async () => {
        const now = Date.now();
        const candidates = [nextReminderCheck(now), live.graceDeadline()];
        if (live.getActiveLiveId() || hasOpenRecordings() || pendingMailCount() > 0) {
          candidates.push(now + HOUSEKEEPING_MS);
        }
        const next = candidates.filter((t) => Number.isFinite(t)).reduce((a, b) => Math.min(a, b), Infinity);
        const current = await this.ctx.storage.getAlarm();
        if (!force && current != null && current <= next) return;
        if (Number.isFinite(next)) await this.ctx.storage.setAlarm(Math.max(next, now + 1000));
        else if (force) await this.ctx.storage.deleteAlarm();
      })
      .catch((err) => console.error("[alarme] Programmation impossible :", err?.stack || err));
    return this.alarmUpdate;
  }

  async alarm() {
    await this.tick();
  }

  /** Tâches périodiques : rappels, live interrompu, enregistrements abandonnés. */
  async tick() {
    if (this.ticking) return this.ticking;
    this.ticking = (async () => {
      try {
        if (Date.now() - this.lastPurge > 3600_000) {
          purgeExpiredSessions();
          this.lastPurge = Date.now();
        }
        live.checkGrace();
        await sweepIdleRecordings();
        await checkReminders({ onLivesChanged: () => live.events.emit("status") });
      } catch (err) {
        console.error("[tick]", err?.stack || err);
      } finally {
        this.ticking = null;
        await this.scheduleAlarm({ force: true });
      }
    })();
    return this.ticking;
  }
}

/** Jeton de session dans un en-tête Cookie brut. */
function readSessionToken(cookieHeader) {
  const name = `${config.session.cookieName}=`;
  for (const part of String(cookieHeader || "").split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(name)) {
      try {
        return decodeURIComponent(trimmed.slice(name.length));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Ajoute des en-têtes à une réponse (sauf WebSocket). */
function withHeaders(response, headers) {
  if (response.status === 101) return response;
  const copy = new Response(response.body, response);
  for (const [key, value] of Object.entries(headers)) {
    if (!copy.headers.has(key)) copy.headers.set(key, value);
  }
  return copy;
}
