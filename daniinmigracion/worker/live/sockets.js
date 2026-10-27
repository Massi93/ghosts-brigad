/**
 * Temps réel (WebSocket) : état du live, viewers, cœurs et signalisation WebRTC.
 *
 * Deux espaces :
 *  - public  (/api/live/ws/live)    : site + page /live. Aucune authentification.
 *  - cockpit (/api/live/ws/cockpit) : réservé à Dani, authentifié par le cookie de session.
 *
 * Protocole (JSON) : client → serveur `[événement, données, idAccusé?]`,
 * serveur → client `[événement, données]` et `["__ack", idAccusé, réponse]`.
 * Le client (src/lib/socket.js) reproduit l'API de Socket.io utilisée par le front.
 *
 * Vidéo : WebRTC en « mesh ». Le navigateur de Dani ouvre une connexion pair-à-pair
 * vers chaque viewer ; le serveur ne fait que relayer les messages de négociation
 * (offre / réponse / candidats ICE). Les viewers ne publient jamais de média.
 */
import * as live from "./liveService.js";
import { isSessionValid } from "../auth/sessions.js";
import { HttpError, ipKey } from "../lib/http.js";
import { randomToken } from "../lib/crypto.js";
import { finishAllForLive, recordingEvents } from "./recordings.js";
import { getIceServers } from "./iceServers.js";

const HEARTS_FLUSH_MS = 250;
const RETRY_MIN_INTERVAL_MS = 5000; // un viewer ne peut redemander une offre qu'une fois toutes les 5 s
// Délai laissé à l'onglet qui diffuse pour envoyer ses derniers morceaux
// avant la finalisation forcée de l'enregistrement (fin du live côté serveur).
const RECORDING_FINALIZE_DELAY_MS = 8000;
const HEARTS_BUCKET = { capacity: 30, refillPerSecond: 12 }; // anti-spam par viewer
const MESSAGE_BUCKET = { capacity: 60, refillPerSecond: 30 }; // messages max par connexion
const MAX_MESSAGE_BYTES = 64 * 1024; // signalisation uniquement (la vidéo ne passe pas par ici)
const IDLE_TIMEOUT_MS = 60_000; // le client envoie un « ping » toutes les 20 s
const MAX_PUBLIC_SOCKETS_PER_IP = 40; // par IPv4 ou réseau IPv6 /64 (onglets, familles, wifi partagé)

// Codes de fermeture compris par le client.
export const CLOSE_SERVER_DISCONNECT = 4000; // déconnexion voulue : pas de reconnexion automatique
export const CLOSE_UNAUTHORIZED = 4401; // refus à la connexion (session absente)

/* ------------------------------------------------------------------ */
/* Connexion WebSocket                                                 */
/* ------------------------------------------------------------------ */

class Connection {
  constructor(ws, { ip, userAgent, geo, session = null }) {
    this.id = randomToken(12);
    this.ws = ws;
    this.ip = ip;
    this.userAgent = userAgent;
    this.geo = geo;
    this.session = session;
    this.open = true;
    this.lastSeen = Date.now();
    this.handlers = new Map();
    this.closeHandlers = [];
    this.guard = null; // vérification avant chaque message (cockpit : session encore valide ?)
    this.bucket = { tokens: MESSAGE_BUCKET.capacity, last: Date.now() };
  }

  send(packet) {
    if (!this.open) return;
    try {
      this.ws.send(JSON.stringify(packet));
    } catch {
      this.handleClose();
    }
  }

  emit(event, data) {
    this.send([event, data ?? null]);
  }

  on(event, fn) {
    this.handlers.set(event, fn);
  }

  onClose(fn) {
    this.closeHandlers.push(fn);
  }

  close(code = 1000, reason = "") {
    if (!this.open) return;
    try {
      this.ws.close(code, reason);
    } catch {
      // déjà fermé
    }
    this.handleClose();
  }

  handleClose() {
    if (!this.open) return;
    this.open = false;
    for (const fn of this.closeHandlers) {
      try {
        fn();
      } catch (err) {
        console.error("[ws] Erreur à la fermeture :", err?.stack || err);
      }
    }
  }

  /** Limite le nombre de messages par seconde (protection contre l'inondation). */
  allowMessage() {
    const now = Date.now();
    this.bucket.tokens = Math.min(
      MESSAGE_BUCKET.capacity,
      this.bucket.tokens + ((now - this.bucket.last) / 1000) * MESSAGE_BUCKET.refillPerSecond
    );
    this.bucket.last = now;
    if (this.bucket.tokens < 1) return false;
    this.bucket.tokens -= 1;
    return true;
  }

  handleMessage(raw) {
    this.lastSeen = Date.now();
    if (typeof raw !== "string" || raw.length > MAX_MESSAGE_BYTES) {
      this.close(1009, "message too big");
      return;
    }
    let packet;
    try {
      packet = JSON.parse(raw);
    } catch {
      return;
    }
    if (!Array.isArray(packet) || typeof packet[0] !== "string") return;
    const [event, data, ackId] = packet;
    if (event === "__ping") {
      // Cockpit : une session expirée ne reçoit plus rien, même si l'onglet ne fait que « pinguer ».
      if (this.guard && !this.guard()) return;
      this.send(["__pong"]);
      return;
    }
    if (!this.allowMessage()) return;
    if (this.guard && !this.guard()) return;

    const handler = this.handlers.get(event);
    if (!handler) return;
    const ack = Number.isInteger(ackId) ? (response) => this.send(["__ack", ackId, response ?? null]) : undefined;
    try {
      const result = handler(data, ack);
      if (result && typeof result.catch === "function") {
        result.catch((err) => console.error(`[ws] ${event} :`, err?.stack || err));
      }
    } catch (err) {
      console.error(`[ws] ${event} :`, err?.stack || err);
    }
  }
}

/** Accepte un WebSocket et branche les événements bruts sur une `Connection`. */
function acceptSocket(info) {
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);
  server.accept();
  const conn = new Connection(server, info);
  server.addEventListener("message", (event) => conn.handleMessage(event.data));
  server.addEventListener("close", () => conn.handleClose());
  server.addEventListener("error", () => conn.handleClose());
  return { conn, response: new Response(null, { status: 101, webSocket: client }) };
}

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
        usernameFragment: typeof candidate.usernameFragment === "string" ? candidate.usernameFragment : null,
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

/** Convertit une erreur en réponse d'accusé de réception. */
function ackError(ack, err) {
  if (typeof ack !== "function") return;
  if (err instanceof HttpError) ack({ error: err.message, code: err.code });
  else {
    console.error("[ws]", err?.stack || err);
    ack({ error: "Error interno" });
  }
}

/* ------------------------------------------------------------------ */
/* Branchement sur le service live                                     */
/* ------------------------------------------------------------------ */

export function setupSockets() {
  const pub = new Map(); // id -> Connection (site + page /live)
  const cockpit = new Map(); // id -> Connection (cockpit)
  const viewersRoom = new Set(); // ids des connexions publiques entrées dans la salle des viewers

  const emitAll = (map, event, data) => {
    for (const conn of map.values()) conn.emit(event, data);
  };
  const emitTo = (map, id, event, data) => map.get(id)?.emit(event, data);

  /* ---------------- Minuteurs actifs seulement s'il y a des connexions ---------------- */

  let heartsTimer = null;
  let sweepTimer = null;

  function updateTimers() {
    const any = pub.size + cockpit.size > 0;
    if (any && !sweepTimer) sweepTimer = setInterval(sweep, 15_000);
    if (!any && sweepTimer) {
      clearInterval(sweepTimer);
      sweepTimer = null;
    }
    if (viewersRoom.size > 0 && !heartsTimer) heartsTimer = setInterval(flushHearts, HEARTS_FLUSH_MS);
    if (viewersRoom.size === 0 && heartsTimer) {
      clearInterval(heartsTimer);
      heartsTimer = null;
      flushHearts();
    }
  }

  /** Ferme les connexions silencieuses (réseau coupé sans fermeture propre). */
  function sweep() {
    const limit = Date.now() - IDLE_TIMEOUT_MS;
    for (const map of [pub, cockpit]) {
      for (const conn of [...map.values()]) if (conn.lastSeen < limit) conn.close(1001, "idle");
    }
    // Cockpit : sessions expirées entre deux messages.
    for (const conn of [...cockpit.values()]) conn.guard?.();
  }

  // Envoi groupé des cœurs : chaque viewer reçoit les cœurs des AUTRES
  // (les siens sont déjà affichés localement), le cockpit reçoit le total.
  function flushHearts() {
    const { total, bySocket, hearts } = live.drainHearts();
    if (!total) return;
    for (const id of viewersRoom) {
      const others = total - (bySocket.get(id) ?? 0);
      emitTo(pub, id, "hearts", { n: others > 0 ? Math.min(others, 30) : 0, total: hearts });
    }
    emitAll(cockpit, "hearts:update", { hearts, received: total });
  }

  /* -------------------------- Espace public -------------------------- */

  function acceptPublic(info) {
    if (!["127.0.0.1", "::1"].includes(info.ip)) {
      const key = ipKey(info.ip);
      let same = 0;
      for (const c of pub.values()) if (ipKey(c.ip) === key) same += 1;
      if (same >= MAX_PUBLIC_SOCKETS_PER_IP) return new Response("Demasiadas conexiones", { status: 429 });
    }
    const { conn, response } = acceptSocket(info);
    pub.set(conn.id, conn);
    updateTimers();
    conn.emit("__hello", { id: conn.id });
    conn.emit("live:status", live.getPublicStatus());

    const bucket = { tokens: HEARTS_BUCKET.capacity, last: Date.now() };
    let lastRetryAt = 0;

    // La page /live rejoint la « salle » des viewers.
    conn.on("viewer:join", (_payload, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      // Déjà dans la salle : on ne redéclenche pas de négociation WebRTC.
      if (live.isViewer(conn.id)) return reply({ ok: true, iceServers: getIceServers() });

      const blocker = live.joinBlocker();
      if (blocker) return reply({ ok: false, reason: blocker });

      const result = live.addViewer(conn.id, { ip: conn.ip, userAgent: conn.userAgent, geo: conn.geo });
      if (result !== "ok") return reply({ ok: false, reason: result });

      viewersRoom.add(conn.id);
      updateTimers();
      reply({ ok: true, iceServers: getIceServers() });
      // Le compteur envoyé juste avant (addViewer) ne comptait pas encore ce viewer.
      conn.emit("live:stats", live.getStats());

      // Si Dani diffuse déjà, on lui demande d'ouvrir une connexion vers ce viewer.
      const broadcaster = live.getBroadcasterSocketId();
      if (broadcaster) emitTo(cockpit, broadcaster, "viewer:new", { viewerId: conn.id });
    });

    // Le viewer redemande une offre (connexion WebRTC échouée).
    conn.on("viewer:retry", () => {
      if (Date.now() - lastRetryAt < RETRY_MIN_INTERVAL_MS) return;
      lastRetryAt = Date.now();
      const broadcaster = live.getBroadcasterSocketId();
      if (broadcaster && live.isViewer(conn.id)) {
        emitTo(cockpit, broadcaster, "viewer:new", { viewerId: conn.id });
      }
    });

    // Réponse SDP / candidats ICE du viewer → relayés au navigateur de Dani.
    conn.on("rtc:signal", (payload) => {
      const broadcaster = live.getBroadcasterSocketId();
      const signal = sanitizeSignal(payload);
      if (!broadcaster || !signal || !live.isViewer(conn.id)) return;
      emitTo(cockpit, broadcaster, "rtc:signal", { ...signal, from: conn.id });
    });

    // « Me gusta » : les cœurs sont groupés et limités (seau à jetons).
    conn.on("hearts", (payload) => {
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
      live.addHearts(conn.id, accepted);
    });

    const leave = () => {
      viewersRoom.delete(conn.id);
      if (live.removeViewer(conn.id)) {
        const broadcaster = live.getBroadcasterSocketId();
        if (broadcaster) emitTo(cockpit, broadcaster, "viewer:left", { viewerId: conn.id });
      }
      updateTimers();
    };
    conn.on("viewer:leave", leave);
    conn.onClose(() => {
      pub.delete(conn.id);
      leave();
    });
    return response;
  }

  /* ------------------------- Espace cockpit -------------------------- */

  /** Refuse une connexion du cockpit (session absente ou origine étrangère). */
  function rejectCockpit(info) {
    const { conn, response } = acceptSocket(info);
    conn.emit("__connect_error", { message: "unauthorized" });
    conn.close(CLOSE_UNAUTHORIZED, "unauthorized");
    return response;
  }

  function acceptCockpit(info) {
    const { conn, response } = acceptSocket(info);
    cockpit.set(conn.id, conn);
    updateTimers();

    // La session est revérifiée à chaque message (expirée, déconnectée,
    // mot de passe changé…) : le socket est alors coupé.
    conn.guard = () => {
      if (isSessionValid(conn.session.tokenHash)) return true;
      conn.close(CLOSE_SERVER_DISCONNECT, "unauthorized");
      return false;
    };

    conn.emit("__hello", { id: conn.id });
    conn.emit("cockpit:state", live.getCockpitState());

    // Démarrer / reprendre la diffusion depuis cet onglet.
    conn.on("broadcast:start", (payload, ack) => {
      try {
        const result = live.startBroadcast({
          socketId: conn.id,
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
    conn.on("broadcast:stop", (_payload, ack) => {
      try {
        ack?.({ ok: true, live: live.endLive("manual") });
      } catch (err) {
        ackError(ack, err);
      }
    });

    // Offre SDP / candidats ICE de Dani → relayés au viewer ciblé.
    conn.on("rtc:signal", (payload) => {
      if (conn.id !== live.getBroadcasterSocketId()) return;
      const to = typeof payload?.to === "string" ? payload.to : null;
      const signal = sanitizeSignal(payload);
      if (!to || !signal || !live.isViewer(to)) return;
      emitTo(pub, to, "rtc:signal", signal);
    });

    conn.onClose(() => {
      cockpit.delete(conn.id);
      live.detachBroadcaster(conn.id);
      updateTimers();
    });
    return response;
  }

  /* ------------------- Diffusion des changements d'état ------------------- */

  const broadcastStatus = () => {
    emitAll(pub, "live:status", live.getPublicStatus());
    emitAll(cockpit, "cockpit:state", live.getCockpitState());
  };
  live.events.on("status", broadcastStatus);

  // Liste des viewers (cockpit) et compteur (page /live), au plus 2 fois par seconde.
  const broadcastViewers = throttle(() => {
    emitAll(cockpit, "viewers:update", { viewers: live.listViewers(), stats: live.getStats() });
    const stats = live.getStats();
    for (const id of viewersRoom) emitTo(pub, id, "live:stats", stats);
  }, 500);
  live.events.on("viewers", broadcastViewers);

  live.events.on("ended", ({ liveId }) => {
    for (const id of viewersRoom) emitTo(pub, id, "live:ended", { liveId });
    // Les enregistrements encore ouverts sont finalisés (fin par délai de grâce, ou
    // depuis un autre onglet) après un court délai pour recevoir les derniers morceaux.
    setTimeout(() => {
      finishAllForLive(liveId).catch((err) => console.error("[rec]", err));
    }, RECORDING_FINALIZE_DELAY_MS);
  });

  live.events.on("revoked", ({ socketId }) => emitTo(cockpit, socketId, "broadcast:revoked"));

  recordingEvents.on("changed", () => emitAll(cockpit, "recordings:changed"));

  return {
    acceptPublic,
    acceptCockpit,
    rejectCockpit,
    /** Prévient tous les navigateurs d'un changement (ex. live programmé depuis l'API). */
    broadcastStatus,
    /** Coupe les sockets du cockpit d'une session fermée (déconnexion). */
    disconnectSession(tokenHash) {
      for (const conn of [...cockpit.values()]) {
        if (conn.session?.tokenHash === tokenHash) conn.close(CLOSE_SERVER_DISCONNECT, "logout");
      }
    },
    /** Notifie le cockpit (progression des envois d'emails, etc.). */
    emitToCockpit(event, data) {
      emitAll(cockpit, event, data);
    },
    connectionCount() {
      return pub.size + cockpit.size;
    },
  };
}
