/**
 * Connexions temps réel (WebSocket) avec le serveur Live (Durable Object Cloudflare).
 *  - public  : partagé par le bouton LIVE, la rubrique « Próximo live » et la page /live
 *  - cockpit : réservé au cockpit (authentifié par le cookie de session)
 *
 * Petit client qui reproduit la partie de l'API Socket.io utilisée par le site :
 * `on / off / emit`, accusés de réception (`timeout(ms).emit(…, cb)`), `connect`,
 * `disconnect`, `id`, `connected`, reconnexion automatique et `socket.io.on("reconnect")`.
 *
 * Protocole : `[événement, données, idAccusé?]` (voir worker/live/sockets.js).
 */

import { translateServerMessage } from "./serverMessages";

const CLOSE_SERVER_DISCONNECT = 4000; // déconnexion voulue par le serveur
const CLOSE_UNAUTHORIZED = 4401; // session absente à la connexion
const PING_MS = 20_000;
const MAX_BUFFER = 200; // messages gardés pendant une coupure

class Emitter {
  constructor() {
    this.listeners = new Map();
  }
  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return this;
  }
  off(event, fn) {
    this.listeners.get(event)?.delete(fn);
    return this;
  }
  emitLocal(event, ...args) {
    for (const fn of [...(this.listeners.get(event) ?? [])]) {
      try {
        fn(...args);
      } catch (err) {
        console.error(`[socket] « ${event} » :`, err);
      }
    }
  }
}

export class LiveSocket extends Emitter {
  /**
   * @param {string} path chemin du WebSocket (ex. "/api/live/ws/live")
   * @param {{ autoConnect?: boolean }} [options]
   */
  constructor(path, { autoConnect = true } = {}) {
    super();
    this.path = path;
    this.ws = null;
    this.id = undefined;
    this.connected = false;
    this.wanted = false; // connexion souhaitée (false après `disconnect()`)
    this.everConnected = false;
    this.attempts = 0;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.ackId = 0;
    this.acks = new Map(); // id -> { fn, timer }
    this.buffer = [];
    // Équivalent du « Manager » de Socket.io (événement « reconnect »).
    this.io = new Emitter();
    if (autoConnect) this.connect();
  }

  url() {
    const { protocol, host } = window.location;
    return `${protocol === "https:" ? "wss" : "ws"}://${host}${this.path}`;
  }

  connect() {
    this.wanted = true;
    if (this.ws) return this;
    clearTimeout(this.reconnectTimer);
    let ws;
    try {
      ws = new WebSocket(this.url());
    } catch {
      this.scheduleReconnect();
      return this;
    }
    this.ws = ws;
    ws.onmessage = (event) => this.onPacket(event.data);
    ws.onclose = (event) => this.onClose(ws, event);
    ws.onerror = () => {}; // suivi de « close »
    return this;
  }

  disconnect() {
    this.wanted = false;
    clearTimeout(this.reconnectTimer);
    const ws = this.ws;
    if (ws) {
      this.ws = null;
      ws.onclose = null;
      try {
        ws.close(1000);
      } catch {
        // déjà fermé
      }
      this.handleDisconnect("io client disconnect");
    }
    this.buffer = [];
    return this;
  }

  /** Socket.io : `socket.timeout(ms).emit(event, data, (err, res) => …)` */
  timeout(ms) {
    return { emit: (event, data, ack) => this.emitWithTimeout(event, data, ack, ms) };
  }

  emit(event, data, ack) {
    return this.emitWithTimeout(event, data, ack ? (_err, res) => ack(res) : undefined, null);
  }

  emitWithTimeout(event, data, ack, ms) {
    const packet = [event, data ?? null];
    if (typeof ack === "function") {
      const id = ++this.ackId;
      const timer = ms
        ? setTimeout(() => {
            this.acks.delete(id);
            ack(new Error("operation has timed out"));
          }, ms)
        : null;
      this.acks.set(id, { fn: ack, timer });
      packet.push(id);
    }
    if (this.connected) this.sendRaw(packet);
    else if (this.wanted && this.buffer.length < MAX_BUFFER) this.buffer.push(packet);
    return this;
  }

  sendRaw(packet) {
    try {
      this.ws.send(JSON.stringify(packet));
    } catch {
      // la fermeture déclenchera la reconnexion
    }
  }

  onPacket(raw) {
    let packet;
    try {
      packet = JSON.parse(raw);
    } catch {
      return;
    }
    if (!Array.isArray(packet)) return;
    const [event, data, extra] = packet;
    switch (event) {
      case "__hello": {
        const reconnected = this.everConnected;
        this.id = data?.id;
        this.connected = true;
        this.everConnected = true;
        this.attempts = 0;
        this.startPing();
        for (const p of this.buffer.splice(0)) this.sendRaw(p);
        this.emitLocal("connect");
        if (reconnected) this.io.emitLocal("reconnect");
        return;
      }
      case "__ack": {
        const pending = this.acks.get(data);
        if (!pending) return;
        this.acks.delete(data);
        clearTimeout(pending.timer);
        pending.fn(null, extra);
        return;
      }
      case "__connect_error":
        this.emitLocal("connect_error", new Error(data?.message || "error"));
        return;
      case "__pong":
        return;
      default:
        this.emitLocal(event, data);
    }
  }

  startPing() {
    clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      if (this.connected) this.sendRaw(["__ping"]);
    }, PING_MS);
  }

  handleDisconnect(reason) {
    clearInterval(this.pingTimer);
    const wasConnected = this.connected;
    this.connected = false;
    this.id = undefined;
    // Les accusés en attente ne viendront plus (Socket.io les ferait expirer).
    for (const [id, { fn, timer }] of this.acks) {
      if (timer) continue; // ceux avec délai expireront d'eux-mêmes
      this.acks.delete(id);
      fn(new Error("disconnected"));
    }
    if (wasConnected) this.emitLocal("disconnect", reason);
  }

  onClose(ws, event) {
    if (this.ws !== ws) return;
    this.ws = null;
    if (event.code === CLOSE_UNAUTHORIZED) {
      // Refus à la connexion (« connect_error » déjà émis) : pas de nouvel essai.
      this.wanted = false;
      this.handleDisconnect("io server disconnect");
      return;
    }
    if (event.code === CLOSE_SERVER_DISCONNECT) {
      // Comme Socket.io : après une déconnexion voulue par le serveur, l'application décide.
      this.wanted = false;
      this.buffer = [];
      this.handleDisconnect("io server disconnect");
      return;
    }
    this.handleDisconnect("transport close");
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (!this.wanted) return;
    clearTimeout(this.reconnectTimer);
    const base = Math.min(1000 * 2 ** this.attempts, 10_000);
    this.attempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.ws = null;
      this.connect();
    }, base * (0.75 + Math.random() * 0.5));
  }
}

let publicSocket = null;

/** Socket public unique pour toute la page. */
export function getPublicSocket() {
  if (!publicSocket) publicSocket = new LiveSocket("/api/live/ws/live");
  return publicSocket;
}

/** Nouveau socket pour le cockpit (connecté explicitement par le composant qui l'utilise). */
export function createCockpitSocket() {
  return new LiveSocket("/api/live/ws/cockpit", { autoConnect: false });
}

/** `socket.emit` avec accusé de réception sous forme de promesse (délai max 10 s). */
export function emitWithAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(10_000).emit(event, payload, (err, response) => {
      if (err) return reject(new Error(translateServerMessage("El servidor no responde")));
      if (response?.error) {
        const error = new Error(translateServerMessage(response.error));
        error.code = response.code; // ex. "ended", "busy"
        return reject(error);
      }
      resolve(response);
    });
  });
}
