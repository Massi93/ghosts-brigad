/**
 * État en temps réel du live (en mémoire) et transitions métier.
 *
 * Ce module ne connaît pas Socket.io : il émet des événements (`events`)
 * que `sockets.js` relaie aux navigateurs. Il n'y a qu'un seul live actif à la fois.
 *
 * Événements émis :
 *  - "status"  : l'état public a changé (live démarré, interrompu, terminé, programmé…)
 *  - "viewers" : la liste des viewers a changé
 *  - "ended"   : { liveId } un live vient de se terminer
 *  - "revoked" : { socketId } un autre onglet a pris le contrôle de la caméra
 */
import { EventEmitter } from "node:events";
import { config } from "../config.js";
import { getSettings } from "../lib/settings.js";
import { HttpError } from "../lib/http.js";
import { describeDevice, locateIp, maskIp } from "../geo/geo.js";
import {
  createLive,
  getActiveLive,
  getLive,
  getNextScheduled,
  markLiveEnded,
  markLiveStarted,
  saveLiveStats,
  toAdminLive,
  toPublicLive,
} from "./livesRepo.js";

export const events = new EventEmitter();

/** Live en cours. `liveId === null` quand aucun live n'est actif. */
const state = {
  liveId: null,
  broadcasterSocketId: null,
  interruptedSince: null, // horodatage (ms) de la perte de la caméra
  graceTimer: null,
  hearts: 0,
  peakViewers: 0,
  totalViewers: 0,
};

/** Viewers connectés à la page /live (y compris en salle d'attente avant le début). */
const viewers = new Map(); // socketId -> viewer

/** Cœurs reçus depuis le dernier envoi groupé : socketId -> nombre. */
let pendingHearts = new Map();

/* ------------------------------------------------------------------ */
/* Lecture de l'état                                                   */
/* ------------------------------------------------------------------ */

function currentLiveRow() {
  return state.liveId ? getLive(state.liveId) : null;
}

/** Réglages du site exposés publiquement (rubrique « Próximo live »). */
function publicSite() {
  const s = getSettings();
  return {
    liveSectionEnabled: s.liveSectionEnabled,
    liveSectionTitle: s.liveSectionTitle,
    liveSectionText: s.liveSectionText,
  };
}

/** État envoyé au site et à la page /live. */
export function getPublicStatus() {
  const row = currentLiveRow() ?? getNextScheduled();
  const live = toPublicLive(row);
  if (live && live.status === "live") {
    live.interrupted = !state.broadcasterSocketId;
    live.viewers = viewers.size;
    live.hearts = state.hearts;
  }
  return { live, site: publicSite(), serverNow: Date.now() };
}

/** Liste des viewers pour le cockpit (IP masquée). */
export function listViewers() {
  return [...viewers.values()].map(({ ip, ...viewer }) => viewer);
}

/** État complet envoyé au cockpit. */
export function getCockpitState() {
  return {
    live: toAdminLive(currentLiveRow()),
    next: toPublicLive(getNextScheduled()),
    broadcasterSocketId: state.broadcasterSocketId,
    interruptedSince: state.interruptedSince,
    graceSeconds: config.live.graceSeconds,
    stats: getStats(),
    viewers: listViewers(),
    iceServers: config.live.iceServers,
    serverNow: Date.now(),
  };
}

export function getStats() {
  return {
    viewers: viewers.size,
    peakViewers: state.peakViewers,
    totalViewers: state.totalViewers,
    hearts: state.hearts,
  };
}

export function getBroadcasterSocketId() {
  return state.broadcasterSocketId;
}

export function isViewer(socketId) {
  return viewers.has(socketId);
}

export function viewerIds() {
  return [...viewers.keys()];
}

/* ------------------------------------------------------------------ */
/* Démarrage / arrêt du live                                           */
/* ------------------------------------------------------------------ */

function clearGraceTimer() {
  if (state.graceTimer) clearTimeout(state.graceTimer);
  state.graceTimer = null;
}

function persistStats() {
  if (state.liveId) saveLiveStats(state.liveId, getStats());
}

/**
 * Démarre (ou reprend) la diffusion depuis un onglet du cockpit.
 *
 * @param {object} opts
 * @param {string} opts.socketId   socket du cockpit qui diffuse
 * @param {number} [opts.liveId]   live programmé à démarrer
 * @param {string} [opts.title]    titre d'un live immédiat (non programmé)
 * @param {boolean} [opts.takeover] reprendre la main sur un autre onglet
 * @returns {{ live: object, viewerIds: string[], resumed: boolean }}
 */
export function startBroadcast({ socketId, liveId, title, takeover = false }) {
  // Un live est déjà en cours : on rattache la caméra (reprise après coupure).
  if (state.liveId) {
    if (state.broadcasterSocketId && state.broadcasterSocketId !== socketId) {
      if (!takeover) {
        throw new HttpError(409, "Ya se está transmitiendo desde otra pestaña", "busy");
      }
      events.emit("revoked", { socketId: state.broadcasterSocketId });
    }
    state.broadcasterSocketId = socketId;
    state.interruptedSince = null;
    clearGraceTimer();
    events.emit("status");
    return { live: toAdminLive(currentLiveRow()), viewerIds: viewerIds(), resumed: true };
  }

  let row;
  if (liveId) {
    row = getLive(liveId);
    if (!row || row.status !== "scheduled") {
      throw new HttpError(400, "Este live no se puede iniciar", "not_startable");
    }
    row = markLiveStarted(row.id);
  } else {
    const cleanTitle = typeof title === "string" && title.trim() ? title.trim().slice(0, 120) : "";
    row = createLive({ title: cleanTitle || "Live con Dani", status: "live" });
  }

  state.liveId = row.id;
  state.broadcasterSocketId = socketId;
  state.interruptedSince = null;
  state.hearts = 0;
  // Les viewers déjà en salle d'attente comptent dès le démarrage.
  state.peakViewers = viewers.size;
  state.totalViewers = viewers.size;
  pendingHearts = new Map();
  persistStats();

  console.log(`[live] Live #${row.id} démarré : « ${row.title} »`);
  events.emit("status");
  events.emit("viewers");
  return { live: toAdminLive(row), viewerIds: viewerIds(), resumed: false };
}

/** Termine le live en cours (bouton « Terminer » ou délai de grâce expiré). */
export function endLive(reason = "manual") {
  if (!state.liveId) return null;
  clearGraceTimer();
  const liveId = state.liveId;
  const row = markLiveEnded(liveId, getStats());

  state.liveId = null;
  state.broadcasterSocketId = null;
  state.interruptedSince = null;
  state.hearts = 0;
  state.peakViewers = 0;
  state.totalViewers = 0;
  pendingHearts = new Map();

  console.log(`[live] Live #${liveId} terminé (${reason}).`);
  events.emit("ended", { liveId, reason });
  events.emit("status");
  return toAdminLive(row);
}

/**
 * La caméra s'est déconnectée (onglet fermé, rechargé, réseau coupé…).
 * Le live reste ouvert pendant LIVE_GRACE_SECONDS pour permettre une reprise.
 */
export function detachBroadcaster(socketId) {
  if (!state.liveId || state.broadcasterSocketId !== socketId) return;
  state.broadcasterSocketId = null;
  state.interruptedSince = Date.now();
  armGraceTimer();
  console.log(`[live] Caméra déconnectée, fin automatique dans ${config.live.graceSeconds} s sans reprise.`);
  events.emit("status");
}

function armGraceTimer() {
  clearGraceTimer();
  state.graceTimer = setTimeout(() => endLive("timeout"), config.live.graceSeconds * 1000);
  state.graceTimer.unref();
}

/**
 * Au démarrage du serveur : si un live était en cours (crash, redémarrage),
 * on le restaure en état « interrompu » avec le délai de grâce.
 */
export function restoreAfterRestart() {
  const row = getActiveLive();
  if (!row) return;
  state.liveId = row.id;
  state.hearts = row.hearts;
  state.peakViewers = row.peak_viewers;
  state.totalViewers = row.total_viewers;
  state.interruptedSince = Date.now();
  armGraceTimer();
  console.log(`[live] Live #${row.id} restauré après redémarrage (en attente de la caméra).`);
}

/* ------------------------------------------------------------------ */
/* Viewers                                                             */
/* ------------------------------------------------------------------ */

/** Retourne `true` si un viewer peut rejoindre (live en cours ou programmé). */
export function canJoin() {
  return Boolean(state.liveId || getNextScheduled());
}

export function addViewer(socketId, { ip, userAgent }) {
  if (viewers.has(socketId)) return true;
  if (viewers.size >= config.live.maxViewers) return false;

  const { device, browser } = describeDevice(userAgent);
  const viewer = {
    id: socketId,
    ip,
    maskedIp: maskIp(ip),
    location: "Localizando…",
    city: null,
    country: null,
    countryCode: null,
    device,
    browser,
    joinedAt: new Date().toISOString(),
  };
  viewers.set(socketId, viewer);

  if (state.liveId) {
    state.totalViewers += 1;
    state.peakViewers = Math.max(state.peakViewers, viewers.size);
  }
  events.emit("viewers");

  // Géolocalisation asynchrone : la liste est mise à jour dès la réponse.
  locateIp(ip).then((geo) => {
    const current = viewers.get(socketId);
    if (!current) return;
    Object.assign(current, {
      location: geo.label,
      city: geo.city,
      country: geo.country,
      countryCode: geo.countryCode,
    });
    events.emit("viewers");
  });
  return true;
}

export function removeViewer(socketId) {
  if (!viewers.delete(socketId)) return false;
  pendingHearts.delete(socketId);
  events.emit("viewers");
  return true;
}

/* ------------------------------------------------------------------ */
/* Cœurs (« me gusta »)                                                */
/* ------------------------------------------------------------------ */

/** Ajoute des cœurs envoyés par un viewer (uniquement pendant le live). */
export function addHearts(socketId, count) {
  if (!state.liveId || !viewers.has(socketId) || count <= 0) return;
  pendingHearts.set(socketId, (pendingHearts.get(socketId) ?? 0) + count);
}

/**
 * Récupère et remet à zéro les cœurs en attente (appelé toutes les 250 ms).
 * @returns {{ total: number, bySocket: Map<string, number>, hearts: number }}
 */
export function drainHearts() {
  if (pendingHearts.size === 0) return { total: 0, bySocket: new Map(), hearts: state.hearts };
  const bySocket = pendingHearts;
  pendingHearts = new Map();
  let total = 0;
  for (const n of bySocket.values()) total += n;
  state.hearts += total;
  persistStats();
  return { total, bySocket, hearts: state.hearts };
}
