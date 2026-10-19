/**
 * Temps réel (Socket.io) : état du live, viewers, cœurs et signalisation WebRTC.
 *
 * Deux espaces de noms :
 *  - `/live`    : public (site + page /live). Aucune authentification.
 *  - `/cockpit` : réservé à Dani, authentifié par le cookie de session.
 *
 * Vidéo : WebRTC en « mesh ». Le navigateur de Dani ouvre une connexion pair-à-pair
 * vers chaque viewer ; le serveur ne fait que relayer les messages de négociation
 * (offre / réponse / candidats ICE). Les viewers ne publient jamais de média.
 */
import * as live from "./liveService.js";
import { findSession, isSessionValid, tokenFromCookieHeader } from "../auth/sessions.js";
import { config } from "../config.js";
import { clientIpFrom, HttpError } from "../lib/http.js";
import { finishAllForLive, recordingEvents } from "./recordings.js";

const HEARTS_FLUSH_MS = 250;
const RETRY_MIN_INTERVAL_MS = 5000; // un viewer ne peut redemander une offre qu'une fois toutes les 5 s
// Délai laissé à l'onglet qui diffuse pour envoyer ses derniers morceaux
// avant la finalisation forcée de l'enregistrement (fin du live côté serveur).
const RECORDING_FINALIZE_DELAY_MS = 8000;
const HEARTS_BUCKET = { capacity: 30, refillPerSecond: 12 }; // anti-spam par viewer

/* ------------------------------------------------------------------ */
/* Validation des messages WebRTC                                      */
/* ------------------------------------------------------------------ */

/** Ne garde que les champs attendus d'un message de signalisation. */
function sanitizeSignal(payload) {
  if (!payload || typeof payload !== "object") return null;
  const { sid, description, candidate } = payload;
  if (typeof sid !== "string" || sid.length > 64) return null;

  if (description) {
    if (!["offer", "answer"].includes(description.type)) return null;
    if (typeof description.sdp !== "string" || description.sdp.length > 30_000) return null;
    return { sid, description: { type: description.type, sdp: description.sdp } };
  }
  if (candidate) {
    if (typeof candidate.candidate !== "string" || candidate.candidate.length > 2000) return null;
    return {
      sid,
      candidate: {
        candidate: candidate.candidate,
        sdpMid: typeof candidate.sdpMid === "string" ? candidate.sdpMid : null,
        sdpMLineIndex: Number.isInteger(candidate.sdpMLineIndex) ? candidate.sdpMLineIndex : null,
        usernameFragment:
          typeof candidate.usernameFragment === "string" ? candidate.usernameFragment : null,
      },
    };
  }
  return null;
}

/** Petit utilitaire : n'exécute `fn` qu'au plus une fois par `ms`. */
function throttle(fn, ms) {
  let timer = null;
  let pending = false;
  return () => {
    if (timer) {
      pending = true;
      return;
    }
    fn();
    timer = setTimeout(() => {
      timer = null;
      if (pending) {
        pending = false;
        fn();
      }
    }, ms);
  };
}

/** Convertit une erreur en réponse d'acquittement Socket.io. */
function ackError(ack, err) {
  if (typeof ack !== "function") return;
  if (err instanceof HttpError) ack({ error: err.message, code: err.code });
  else {
    console.error("[socket]", err);
    ack({ error: "Error interno" });
  }
}

/**
 * Branche Socket.io sur le service live.
 * @param {import("socket.io").Server} io
 */
export function setupSockets(io) {
  const pub = io.of("/live");
  const cockpit = io.of("/cockpit");

  /* -------------------------- Espace public -------------------------- */

  pub.on("connection", (socket) => {
    socket.emit("live:status", live.getPublicStatus());
    const bucket = { tokens: HEARTS_BUCKET.capacity, last: Date.now() };
    let lastRetryAt = 0;

    // La page /live rejoint la « salle » des viewers.
    socket.on("viewer:join", (_payload, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      // Déjà dans la salle : on ne redéclenche pas de négociation WebRTC.
      if (live.isViewer(socket.id)) return reply({ ok: true, iceServers: config.live.iceServers });

      const blocker = live.joinBlocker();
      if (blocker) return reply({ ok: false, reason: blocker });

      const ip = clientIpFrom(socket.handshake.headers, socket.handshake.address);
      const result = live.addViewer(socket.id, { ip, userAgent: socket.handshake.headers["user-agent"] });
      if (result !== "ok") return reply({ ok: false, reason: result });

      socket.join("viewers");
      reply({ ok: true, iceServers: config.live.iceServers });

      // Si Dani diffuse déjà, on lui demande d'ouvrir une connexion vers ce viewer.
      const broadcaster = live.getBroadcasterSocketId();
      if (broadcaster) cockpit.to(broadcaster).emit("viewer:new", { viewerId: socket.id });
    });

    // Le viewer redemande une offre (connexion WebRTC échouée).
    socket.on("viewer:retry", () => {
      if (Date.now() - lastRetryAt < RETRY_MIN_INTERVAL_MS) return;
      lastRetryAt = Date.now();
      const broadcaster = live.getBroadcasterSocketId();
      if (broadcaster && live.isViewer(socket.id)) {
        cockpit.to(broadcaster).emit("viewer:new", { viewerId: socket.id });
      }
    });

    // Réponse SDP / candidats ICE du viewer → relayés au navigateur de Dani.
    socket.on("rtc:signal", (payload) => {
      const broadcaster = live.getBroadcasterSocketId();
      const signal = sanitizeSignal(payload);
      if (!broadcaster || !signal || !live.isViewer(socket.id)) return;
      cockpit.to(broadcaster).emit("rtc:signal", { ...signal, from: socket.id });
    });

    // « Me gusta » : les cœurs sont groupés et limités (seau à jetons).
    socket.on("hearts", (payload) => {
      const requested = Math.min(Math.max(Number.parseInt(payload?.n, 10) || 0, 0), 20);
      if (!requested) return;
      const now = Date.now();
      bucket.tokens = Math.min(
        HEARTS_BUCKET.capacity,
        bucket.tokens + ((now - bucket.last) / 1000) * HEARTS_BUCKET.refillPerSecond
      );
      bucket.last = now;
      const accepted = Math.min(requested, Math.floor(bucket.tokens));
      if (accepted <= 0) return;
      bucket.tokens -= accepted;
      live.addHearts(socket.id, accepted);
    });

    const leave = () => {
      if (!live.removeViewer(socket.id)) return;
      socket.leave("viewers");
      const broadcaster = live.getBroadcasterSocketId();
      if (broadcaster) cockpit.to(broadcaster).emit("viewer:left", { viewerId: socket.id });
    };
    socket.on("viewer:leave", leave);
    socket.on("disconnect", leave);
  });

  /* ------------------------- Espace cockpit -------------------------- */

  // Authentification par le cookie de session (même cookie que l'API).
  cockpit.use((socket, next) => {
    const session = findSession(tokenFromCookieHeader(socket.request.headers.cookie));
    if (!session) return next(new Error("unauthorized"));
    socket.data.session = session;
    next();
  });

  cockpit.on("connection", (socket) => {
    // La session est revérifiée à chaque message (expirée, déconnectée,
    // mot de passe changé…) : le socket est alors coupé.
    socket.use((_packet, next) => {
      if (isSessionValid(socket.data.session.tokenHash)) return next();
      next(new Error("unauthorized"));
      socket.disconnect(true);
    });
    socket.on("error", () => {});

    socket.emit("cockpit:state", live.getCockpitState());

    // Démarrer / reprendre la diffusion depuis cet onglet.
    socket.on("broadcast:start", (payload, ack) => {
      try {
        const result = live.startBroadcast({
          socketId: socket.id,
          tabId: typeof payload?.tabId === "string" ? payload.tabId.slice(0, 64) : null,
          liveId: Number.isInteger(payload?.liveId) ? payload.liveId : undefined,
          title: payload?.title,
          resume: payload?.resume === true,
          takeover: payload?.takeover === true,
        });
        ack?.({ ok: true, ...result });
      } catch (err) {
        ackError(ack, err);
      }
    });

    // Terminer le live.
    socket.on("broadcast:stop", async (_payload, ack) => {
      try {
        const ended = live.endLive("manual");
        ack?.({ ok: true, live: ended });
      } catch (err) {
        ackError(ack, err);
      }
    });

    // Offre SDP / candidats ICE de Dani → relayés au viewer ciblé.
    socket.on("rtc:signal", (payload) => {
      if (socket.id !== live.getBroadcasterSocketId()) return;
      const to = typeof payload?.to === "string" ? payload.to : null;
      const signal = sanitizeSignal(payload);
      if (!to || !signal || !live.isViewer(to)) return;
      pub.to(to).emit("rtc:signal", signal);
    });

    socket.on("disconnect", () => live.detachBroadcaster(socket.id));
  });

  /* ------------------- Diffusion des changements d'état ------------------- */

  const broadcastStatus = () => {
    pub.emit("live:status", live.getPublicStatus());
    cockpit.emit("cockpit:state", live.getCockpitState());
  };
  live.events.on("status", broadcastStatus);

  // Liste des viewers (cockpit) et compteur (page /live), au plus 2 fois par seconde.
  const broadcastViewers = throttle(() => {
    cockpit.emit("viewers:update", { viewers: live.listViewers(), stats: live.getStats() });
    pub.to("viewers").emit("live:stats", live.getStats());
  }, 500);
  live.events.on("viewers", broadcastViewers);

  live.events.on("ended", ({ liveId }) => {
    pub.to("viewers").emit("live:ended", { liveId });
    // Les enregistrements encore ouverts sont finalisés (fin par délai de grâce, ou
    // depuis un autre onglet) après un court délai pour recevoir les derniers morceaux.
    setTimeout(() => {
      finishAllForLive(liveId).catch((err) => console.error("[rec]", err));
    }, RECORDING_FINALIZE_DELAY_MS).unref();
  });

  live.events.on("revoked", ({ socketId }) => {
    cockpit.to(socketId).emit("broadcast:revoked");
  });

  recordingEvents.on("changed", () => cockpit.emit("recordings:changed"));

  // Envoi groupé des cœurs : chaque viewer reçoit les cœurs des AUTRES
  // (les siens sont déjà affichés localement), le cockpit reçoit le total.
  const heartsTimer = setInterval(() => {
    const { total, bySocket, hearts } = live.drainHearts();
    if (!total) return;
    for (const [id, socket] of pub.sockets) {
      if (!live.isViewer(id)) continue;
      const others = total - (bySocket.get(id) ?? 0);
      if (others > 0) socket.emit("hearts", { n: Math.min(others, 30), total: hearts });
      else socket.emit("hearts", { n: 0, total: hearts });
    }
    cockpit.emit("hearts:update", { hearts, received: total });
  }, HEARTS_FLUSH_MS);
  heartsTimer.unref();

  return {
    /** Prévient tous les navigateurs d'un changement (ex. live programmé depuis l'API). */
    broadcastStatus,
    /** Coupe les sockets du cockpit d'une session fermée (déconnexion). */
    disconnectSession(tokenHash) {
      for (const socket of cockpit.sockets.values()) {
        if (socket.data.session?.tokenHash === tokenHash) socket.disconnect(true);
      }
    },
    /** Notifie le cockpit (progression des envois d'emails, etc.). */
    emitToCockpit(event, data) {
      cockpit.emit(event, data);
    },
  };
}
