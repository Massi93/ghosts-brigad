/**
 * Remplace src/lib/socket.js dans la démo : des « sockets » en mémoire qui
 * parlent au serveur simulé, avec la même interface que socket.io-client
 * (on / off / emit / timeout / connect / disconnect).
 */
import { attachSocket, detachSocket, handleSocketEvent } from "./demoServer.js";

// Événements d'état : le dernier reçu est rejoué aux abonnés tardifs.
const STICKY = new Set(["live:status", "cockpit:state"]);
const later = (fn) => setTimeout(fn, 0);

class MockSocket {
  constructor(ns, { autoConnect = true } = {}) {
    this.ns = ns;
    this.id = undefined;
    this.connected = false;
    this.disconnected = true;
    this.handlers = new Map();
    this.sticky = new Map();
    this.io = { on() {}, off() {} };
    if (autoConnect) this.connect();
  }

  on(event, fn) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event).add(fn);
    if (this.sticky.has(event)) {
      later(() => {
        if (!this.handlers.get(event)?.has(fn)) return;
        // Horloge « serveur » remise à l'heure : sinon durées et comptes à rebours seraient décalés.
        const value = this.sticky.get(event);
        fn(value && typeof value === "object" && "serverNow" in value ? { ...value, serverNow: Date.now() } : value);
      });
    }
    return this;
  }

  off(event, fn) {
    this.handlers.get(event)?.delete(fn);
    return this;
  }

  _dispatch(event, ...args) {
    for (const fn of [...(this.handlers.get(event) ?? [])]) fn(...args);
  }

  /** Message du serveur simulé vers ce socket. */
  _receive(event, data) {
    if (STICKY.has(event)) this.sticky.set(event, data);
    later(() => this._dispatch(event, data));
  }

  connect() {
    if (this.connected) return this;
    this.id = `${this.ns}-${Math.random().toString(36).slice(2, 10)}`;
    later(() => {
      if (!attachSocket(this)) {
        this._dispatch("connect_error", new Error("unauthorized"));
        return;
      }
      this.connected = true;
      this.disconnected = false;
      this._dispatch("connect");
    });
    return this;
  }

  _close(reason) {
    if (!this.connected) return;
    this.connected = false;
    this.disconnected = true;
    this.sticky.clear();
    detachSocket(this);
    later(() => this._dispatch("disconnect", reason));
  }

  disconnect() {
    this._close("io client disconnect");
    return this;
  }

  _serverDisconnect() {
    this._close("io server disconnect");
  }

  emit(event, payload, ack) {
    if (!this.connected) return this;
    const reply = typeof ack === "function" ? (res) => later(() => ack(res)) : undefined;
    later(() => handleSocketEvent(this, event, payload, reply));
    return this;
  }

  timeout() {
    return {
      emit: (event, payload, cb) => {
        if (!this.connected) {
          setTimeout(() => cb(new Error("timeout")), 50);
          return;
        }
        this.emit(event, payload, (res) => cb(null, res));
      },
    };
  }
}

let publicSocket = null;

export function getPublicSocket() {
  if (!publicSocket) publicSocket = new MockSocket("live");
  return publicSocket;
}

export function createCockpitSocket() {
  return new MockSocket("cockpit", { autoConnect: false });
}

export function emitWithAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(10_000).emit(event, payload, (err, response) => {
      if (err) return reject(new Error("El servidor no responde"));
      if (response?.error) {
        const error = new Error(response.error);
        error.code = response.code;
        return reject(error);
      }
      resolve(response);
    });
  });
}
