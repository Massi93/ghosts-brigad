/**
 * Serveur simulé de la démo : il reproduit, dans le navigateur, les règles du
 * vrai serveur (server/) — lives, inscriptions, rappels 3 h / 5 min, envois
 * manuels, cœurs, viewers, enregistrements — sans réseau ni base de données.
 *
 * Les composants du site et du cockpit sont exactement les mêmes que ceux de
 * la vraie application : seuls src/lib/api.js, src/lib/socket.js et
 * src/lib/nav.js sont remplacés par des versions qui parlent à ce module.
 * Rien n'est conservé : recharger la page remet la démo à zéro.
 */
import { ApiError } from "./errors.js";
import { fixWebmDurationBlob } from "./webmDuration.js";

const MIN = 60_000;
const HOUR = 60 * MIN;
const GRACE_SECONDS = 180;
const MISSED_AFTER = 120 * MIN;
const WAITING_ROOM = HOUR;
export const ADMIN = { username: "dani", password: "daniinmigracion" };

const iso = (t = Date.now()) => new Date(t).toISOString();
const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
let lastId = 0;
const nextId = () => (lastId += 1);

const DEFAULT_SETTINGS = {
  liveSectionEnabled: true,
  liveSectionTitle: "Próximo live",
  liveSectionText:
    "Conéctate en directo con Dani: resolvemos tus dudas sobre visas, residencia y ciudadanía en tiempo real.",
};

/* ------------------------------------------------------------------ */
/* Données                                                             */
/* ------------------------------------------------------------------ */

const db = {
  loggedIn: false,
  settings: { ...DEFAULT_SETTINGS },
  lives: [],
  registrations: [],
  emails: [],
  recordings: [],
};

/** Live en cours (même structure que server/live/liveService.js). */
const state = {
  liveId: null,
  broadcasterSocketId: null,
  broadcasterTabId: null,
  interruptedSince: null,
  graceTimer: null,
  hearts: 0,
  peakViewers: 0,
  totalViewers: 0,
};
const viewers = new Map();
let pendingHearts = new Map();

/** Dernier flux caméra ouvert par le cockpit (réel ou simulé). */
export const media = { stream: null };
/** Réglages propres à la démo. */
export const demo = { audience: true };

/* ------------------------------------------------------------------ */
/* Abonnements de l'interface de démo                                  */
/* ------------------------------------------------------------------ */

const uiListeners = new Set();
export function subscribe(fn) {
  uiListeners.add(fn);
  return () => uiListeners.delete(fn);
}
function uiChanged() {
  uiListeners.forEach((fn) => fn());
}

/* ------------------------------------------------------------------ */
/* Sockets simulés                                                     */
/* ------------------------------------------------------------------ */

const sockets = { live: new Set(), cockpit: new Set() };

function emit(ns, event, data, only) {
  for (const socket of sockets[ns]) {
    if (!only || only(socket)) socket._receive(event, data);
  }
}

/** Connexion d'un socket ; `false` = refusée (cockpit sans session). */
export function attachSocket(socket) {
  if (socket.ns === "cockpit" && !db.loggedIn) return false;
  sockets[socket.ns].add(socket);
  if (socket.ns === "live") socket._receive("live:status", publicStatus());
  else socket._receive("cockpit:state", cockpitState());
  return true;
}

export function detachSocket(socket) {
  sockets[socket.ns].delete(socket);
  if (socket.ns === "live") removeViewer(socket.id);
  else detachBroadcaster(socket.id);
}

/** Messages envoyés par les pages (mêmes noms que server/live/sockets.js). */
export function handleSocketEvent(socket, event, payload, ack) {
  const reply = ack ?? (() => {});
  if (socket.ns === "live") {
    if (event === "hearts") {
      const n = Math.min(Math.max(Number.parseInt(payload?.n, 10) || 0, 0), 20);
      if (n && state.liveId && viewers.has(socket.id)) {
        pendingHearts.set(socket.id, (pendingHearts.get(socket.id) ?? 0) + n);
      }
    } else if (event === "viewer:leave") {
      removeViewer(socket.id);
    }
    return;
  }
  if (event === "broadcast:start") {
    try {
      reply({ ok: true, ...startBroadcast({ socketId: socket.id, ...payload }) });
    } catch (err) {
      reply({ error: err.message, code: err.code });
    }
  } else if (event === "broadcast:stop") {
    reply({ ok: true, live: endLive("manual") });
  }
}

/* ------------------------------------------------------------------ */
/* Lives                                                               */
/* ------------------------------------------------------------------ */

function toPublicLive(l) {
  if (!l) return null;
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    status: l.status,
    scheduledAt: l.scheduledAt,
    startedAt: l.startedAt,
    endedAt: l.endedAt,
  };
}

function toAdminLive(l) {
  if (!l) return null;
  return {
    ...toPublicLive(l),
    hearts: l.hearts,
    peakViewers: l.peakViewers,
    totalViewers: l.totalViewers,
    createdAt: l.createdAt,
    recordings: db.recordings.filter((r) => r.liveId === l.id).length,
  };
}

const getLive = (id) => db.lives.find((l) => l.id === id) ?? null;
const currentLive = () => (state.liveId ? getLive(state.liveId) : null);

function upcoming() {
  const threshold = Date.now() - MISSED_AFTER;
  return db.lives
    .filter((l) => l.status === "scheduled" && Date.parse(l.scheduledAt) >= threshold)
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
}
const nextScheduled = () => upcoming()[0] ?? null;

function stats() {
  return {
    viewers: viewers.size,
    peakViewers: state.peakViewers,
    totalViewers: state.totalViewers,
    hearts: state.hearts,
  };
}

const listViewers = () => [...viewers.values()].map(({ ip, fake, ...v }) => v);

function publicStatus() {
  const live = toPublicLive(currentLive() ?? nextScheduled());
  if (live?.status === "live") {
    live.interrupted = !state.broadcasterSocketId;
    live.viewers = viewers.size;
    live.hearts = state.hearts;
  }
  const { liveSectionEnabled, liveSectionTitle, liveSectionText } = db.settings;
  return { live, site: { liveSectionEnabled, liveSectionTitle, liveSectionText }, serverNow: Date.now() };
}

function cockpitState() {
  return {
    live: toAdminLive(currentLive()),
    next: toPublicLive(nextScheduled()),
    broadcasterSocketId: state.broadcasterSocketId,
    interruptedSince: state.interruptedSince,
    graceSeconds: GRACE_SECONDS,
    stats: stats(),
    viewers: listViewers(),
    iceServers: [],
    serverNow: Date.now(),
  };
}

function broadcastStatus() {
  emit("live", "live:status", publicStatus());
  emit("cockpit", "cockpit:state", cockpitState());
  uiChanged();
}

let viewersTimer = null;
function broadcastViewers() {
  if (viewersTimer) return;
  viewersTimer = setTimeout(() => {
    viewersTimer = null;
    emit("cockpit", "viewers:update", { viewers: listViewers(), stats: stats() });
    emit("live", "live:stats", stats());
    uiChanged();
  }, 300);
}

const fail = (status, message, code) => {
  throw new ApiError(status, message, code);
};

function startBroadcast({ socketId, tabId = null, liveId, title, resume = false, takeover = false }) {
  if (state.liveId) {
    if (!resume) fail(409, "Ya hay un live en curso", "live_in_progress");
    if (liveId && liveId !== state.liveId) fail(409, "Este live ya terminó", "ended");
    const owner = state.broadcasterSocketId;
    if (owner && owner !== socketId) {
      const sameTab = Boolean(tabId) && tabId === state.broadcasterTabId;
      if (!sameTab && !takeover) fail(409, "Ya se está transmitiendo desde otra pestaña", "busy");
      if (!sameTab) emit("cockpit", "broadcast:revoked", null, (s) => s.id === owner);
    }
    Object.assign(state, { broadcasterSocketId: socketId, broadcasterTabId: tabId, interruptedSince: null });
    clearTimeout(state.graceTimer);
    broadcastStatus();
    return { live: toAdminLive(currentLive()), viewerIds: [], resumed: true };
  }
  if (resume) fail(409, "Este live ya terminó", "ended");

  let live;
  if (liveId) {
    live = getLive(liveId);
    if (!live || live.status !== "scheduled") fail(400, "Este live no se puede iniciar", "not_startable");
    Object.assign(live, { status: "live", startedAt: iso() });
  } else {
    const clean = typeof title === "string" ? title.trim().slice(0, 120) : "";
    if (!clean) fail(400, "Falta el título del live", "missing_title");
    live = createLive({ title: clean, status: "live" });
    live.startedAt = iso();
  }
  Object.assign(state, {
    liveId: live.id,
    broadcasterSocketId: socketId,
    broadcasterTabId: tabId,
    interruptedSince: null,
    hearts: 0,
    peakViewers: viewers.size,
    totalViewers: viewers.size,
  });
  pendingHearts = new Map();
  broadcastStatus();
  broadcastViewers();
  return { live: toAdminLive(live), viewerIds: [], resumed: false };
}

function endLive(reason = "manual") {
  const live = currentLive();
  if (!live) return null;
  clearTimeout(state.graceTimer);
  Object.assign(live, {
    status: "ended",
    endedAt: iso(),
    hearts: state.hearts,
    peakViewers: state.peakViewers,
    totalViewers: state.totalViewers,
  });
  Object.assign(state, {
    liveId: null,
    broadcasterSocketId: null,
    broadcasterTabId: null,
    interruptedSince: null,
    hearts: 0,
    peakViewers: 0,
    totalViewers: 0,
  });
  pendingHearts = new Map();
  emit("live", "live:ended", { liveId: live.id, reason });
  broadcastStatus();
  // Laisse au cockpit le temps d'envoyer ses derniers morceaux d'enregistrement.
  setTimeout(() => {
    db.recordings
      .filter((r) => r.liveId === live.id && r.status === "recording")
      .forEach((r) => finishRecording(r.id));
  }, 8000);
  return toAdminLive(live);
}

function detachBroadcaster(socketId) {
  if (!state.liveId || state.broadcasterSocketId !== socketId) return;
  state.broadcasterSocketId = null;
  state.interruptedSince = Date.now();
  clearTimeout(state.graceTimer);
  state.graceTimer = setTimeout(() => endLive("timeout"), GRACE_SECONDS * 1000);
  broadcastStatus();
}

function createLive({ title, description = null, scheduledAt = null, status = "scheduled" }) {
  const live = {
    id: nextId(),
    title,
    description,
    scheduledAt,
    status,
    startedAt: null,
    endedAt: null,
    hearts: 0,
    peakViewers: 0,
    totalViewers: 0,
    createdAt: iso(),
  };
  db.lives.push(live);
  return live;
}

/* ------------------------------------------------------------------ */
/* Viewers (vous + public simulé)                                      */
/* ------------------------------------------------------------------ */

function addViewer(viewer) {
  if (viewers.has(viewer.id)) return;
  viewers.set(viewer.id, viewer);
  if (state.liveId) {
    state.totalViewers += 1;
    state.peakViewers = Math.max(state.peakViewers, viewers.size);
  }
  broadcastViewers();
}

function removeViewer(id) {
  if (!viewers.delete(id)) return;
  pendingHearts.delete(id);
  broadcastViewers();
}

/** La page /live de la démo entre dans la salle (c'est vous). */
export function joinAsSelf(socketId) {
  const ua = navigator.userAgent;
  addViewer({
    id: socketId,
    maskedIp: "—",
    location: "Tú (esta demo)",
    city: null,
    country: null,
    countryCode: null,
    device: /Mobi|Android|iPhone|iPad/i.test(ua) ? "Móvil" : "Ordenador",
    browser: /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : "Safari",
    joinedAt: iso(),
    peerState: "connected",
  });
}
export const leaveAsSelf = removeViewer;

/** Flux vidéo reçu par la page /live de la démo (copie sans son : pas d'écho du micro). */
let viewerCopy = null;
export function viewerStream() {
  const live = currentLive();
  const source = media.stream;
  if (!live || !state.broadcasterSocketId || !source || !source.active) return null;
  if (viewerCopy?.source !== source) {
    viewerCopy = { source, stream: new MediaStream(source.getVideoTracks()) };
  }
  return viewerCopy.stream;
}

const PLACES = [
  ["Ciudad de México", "México", "MX"],
  ["Guadalajara", "México", "MX"],
  ["Bogotá", "Colombia", "CO"],
  ["Medellín", "Colombia", "CO"],
  ["Caracas", "Venezuela", "VE"],
  ["Lima", "Perú", "PE"],
  ["Houston", "Estados Unidos", "US"],
  ["Miami", "Estados Unidos", "US"],
  ["Los Ángeles", "Estados Unidos", "US"],
  ["Madrid", "España", "ES"],
  ["Buenos Aires", "Argentina", "AR"],
  ["Santo Domingo", "República Dominicana", "DO"],
  ["Ciudad de Guatemala", "Guatemala", "GT"],
  ["San Salvador", "El Salvador", "SV"],
  ["Quito", "Ecuador", "EC"],
];

function fakeViewer() {
  const [city, country, countryCode] = pick(PLACES);
  const mobile = Math.random() < 0.7;
  return {
    id: `sim-${nextId()}`,
    fake: true,
    maskedIp: `${Math.floor(rand(24, 201))}.${Math.floor(rand(1, 255))}.x.x`,
    location: `${city}, ${country}`,
    city,
    country,
    countryCode,
    device: mobile ? "Móvil" : "Ordenador",
    browser: mobile ? pick(["Safari", "Chrome"]) : pick(["Chrome", "Edge", "Firefox", "Safari"]),
    joinedAt: iso(),
    peerState: state.liveId && state.broadcasterSocketId ? "connected" : undefined,
  };
}

let audienceTarget = 9;
function audienceTick() {
  const fakes = [...viewers.values()].filter((v) => v.fake);
  if (!demo.audience) {
    fakes.forEach((v) => removeViewer(v.id));
    return;
  }
  const broadcasting = Boolean(state.liveId && state.broadcasterSocketId);
  const next = nextScheduled();
  const waitingRoom = !state.liveId && next && Date.parse(next.scheduledAt) - Date.now() < WAITING_ROOM;
  if (Math.random() < 0.05) audienceTarget = Math.floor(rand(7, 13));
  const target = broadcasting ? audienceTarget : waitingRoom || state.liveId ? 3 : 0;

  if (fakes.length < target && Math.random() < 0.75) addViewer(fakeViewer());
  else if (fakes.length > target) removeViewer(pick(fakes).id);
  else if (broadcasting && fakes.length && Math.random() < 0.04) removeViewer(pick(fakes).id);

  // État vidéo des viewers simulés : « Viendo » pendant la diffusion.
  let changed = false;
  for (const v of viewers.values()) {
    if (!v.fake) continue;
    const peer = broadcasting ? "connected" : undefined;
    if (v.peerState !== peer) {
      v.peerState = peer;
      changed = true;
    }
  }
  if (changed) broadcastViewers();
}

function simulatedHeartsTick() {
  if (!demo.audience || !state.liveId || !state.broadcasterSocketId) return;
  const fakes = [...viewers.values()].filter((v) => v.fake);
  if (!fakes.length || Math.random() > 0.55) return;
  const who = pick(fakes);
  const n = Math.random() < 0.12 ? Math.floor(rand(4, 8)) : Math.floor(rand(1, 4));
  pendingHearts.set(who.id, (pendingHearts.get(who.id) ?? 0) + n);
}

/** Envoi groupé des cœurs, comme le serveur (chaque viewer reçoit ceux des autres). */
function flushHearts() {
  if (!pendingHearts.size) return;
  const bySocket = pendingHearts;
  pendingHearts = new Map();
  let total = 0;
  for (const n of bySocket.values()) total += n;
  state.hearts += total;
  for (const socket of sockets.live) {
    if (!viewers.has(socket.id)) continue;
    const others = total - (bySocket.get(socket.id) ?? 0);
    socket._receive("hearts", { n: Math.min(others, 30), total: state.hearts });
  }
  emit("cockpit", "hearts:update", { hearts: state.hearts, received: total });
}

/* ------------------------------------------------------------------ */
/* Emails (boîte d'envoi de la démo : rien n'est réellement envoyé)    */
/* ------------------------------------------------------------------ */

const shortDate = (isoDate) =>
  new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long" }).format(new Date(isoDate));
const fullDate = (isoDate) =>
  new Intl.DateTimeFormat("es", { dateStyle: "full", timeStyle: "short" }).format(new Date(isoDate));
const remaining = (ms) => {
  const minutes = Math.max(1, Math.round(ms / MIN));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
};

/** Ajoute un email à la boîte d'envoi ; il passe « envoyé » après un court délai. */
function sendEmail({ registration = null, liveId = null, kind, batchId = null, to, subject, body }, delay) {
  const email = {
    id: nextId(),
    registrationId: registration?.id ?? null,
    liveId,
    kind,
    batchId,
    to,
    subject,
    body,
    status: "pending",
    error: null,
    createdAt: iso(),
    sentAt: null,
  };
  db.emails.push(email);
  uiChanged();
  return new Promise((resolve) => {
    setTimeout(() => {
      email.status = "sent";
      email.sentAt = iso();
      uiChanged();
      resolve(email);
    }, delay ?? rand(250, 700));
  });
}

function confirmationEmail(registration, live) {
  const subject = live?.scheduledAt
    ? `¡Inscripción confirmada! Live con Dani el ${shortDate(live.scheduledAt)}`
    : "¡Inscripción confirmada! Te avisaremos del próximo live";
  const body = live?.scheduledAt
    ? `¡Hola ${registration.firstName}!\n\nTu lugar para el live «${live.title}» está reservado: ${fullDate(live.scheduledAt)}.\n\nTe enviaremos un recordatorio 3 horas y 5 minutos antes.`
    : `¡Hola ${registration.firstName}!\n\nTe avisaremos en cuanto Dani programe el próximo live.`;
  return sendEmail({ registration, liveId: live?.id ?? null, kind: "confirmation", to: registration.email, subject, body });
}

function reminderEmail(registration, live, kind) {
  const left = remaining(Date.parse(live.scheduledAt) - Date.now());
  const subject =
    kind === "reminder_5m"
      ? `🔴 ¡El live empieza en ${left}!`
      : `⏰ Recordatorio: el live con Dani empieza en ${left}`;
  const body = `Hola ${registration.firstName}:\n\nEl live «${live.title}» empieza en ${left} (${fullDate(live.scheduledAt)}).\nEntra en la página del live para verlo.`;
  return sendEmail({ registration, liveId: live.id, kind, to: registration.email, subject, body });
}

/** Rappels automatiques : mêmes règles que server/mail/reminders.js. */
function remindersTick() {
  const now = Date.now();
  let changed = false;
  for (const l of db.lives) {
    if (l.status === "scheduled" && Date.parse(l.scheduledAt) < now - MISSED_AFTER) {
      l.status = "missed";
      changed = true;
    }
  }
  if (changed) broadcastStatus();

  for (const l of db.lives) {
    if (l.status !== "scheduled") continue;
    const before = Date.parse(l.scheduledAt) - now;
    let kind = null;
    let registeredBefore = now;
    if (before <= 3 * HOUR && before > 5 * MIN) {
      kind = "reminder_3h";
      registeredBefore = Date.parse(l.scheduledAt) - 3 * HOUR;
    } else if (before <= 5 * MIN && before > -2 * MIN) {
      kind = "reminder_5m";
    }
    if (!kind) continue;
    for (const r of db.registrations) {
      if (r.unsubscribedAt || Date.parse(r.createdAt) > registeredBefore) continue;
      const already = db.emails.some((e) => e.registrationId === r.id && e.liveId === l.id && e.kind === kind);
      if (!already) reminderEmail(r, l, kind);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Enregistrements (gardés en mémoire)                                 */
/* ------------------------------------------------------------------ */

function toRecordingDto(r) {
  return {
    id: r.id,
    liveId: r.liveId,
    liveTitle: getLive(r.liveId)?.title ?? null,
    filename: r.filename,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    durationMs: r.durationMs,
    status: r.status,
    createdAt: r.createdAt,
    finishedAt: r.finishedAt,
  };
}

async function finishRecording(id, durationMs) {
  const r = db.recordings.find((x) => x.id === id);
  if (!r) fail(404, "Grabación no encontrada");
  if (r.status !== "recording" || r.finishing) return toRecordingDto(r);
  r.finishing = true;
  const duration = Number.isFinite(durationMs) && durationMs > 0 ? Math.round(durationMs) : r.lastChunkAt - r.startedAt;
  let blob = new Blob(r.chunks, { type: r.mimeType.split(";")[0] });
  if (r.mimeType.startsWith("video/webm")) blob = await fixWebmDurationBlob(blob, duration).catch(() => blob);
  Object.assign(r, {
    blob,
    url: URL.createObjectURL(blob),
    chunks: [],
    sizeBytes: blob.size,
    durationMs: duration,
    status: blob.size ? "ready" : "failed",
    finishedAt: iso(),
  });
  emit("cockpit", "recordings:changed", null);
  return toRecordingDto(r);
}

/* ------------------------------------------------------------------ */
/* Inscrits                                                            */
/* ------------------------------------------------------------------ */

function registrationDto(r) {
  const last = db.emails.filter((e) => e.registrationId === r.id).at(-1);
  return {
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    email: r.email,
    liveId: r.liveId,
    liveTitle: getLive(r.liveId)?.title ?? null,
    createdAt: r.createdAt,
    unsubscribedAt: r.unsubscribedAt,
    lastEmail: last ? { kind: last.kind, status: last.status, at: last.sentAt || last.createdAt, error: last.error } : null,
  };
}

function csvCell(value) {
  let str = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  return /[";,\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function registrationsCsv() {
  const date = (d) =>
    new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short" }).format(new Date(d));
  const header = ["Nombre", "Apellido", "Email", "Fecha de inscripción", "Estado", "Live"];
  const lines = [...db.registrations]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((r) =>
      [r.firstName, r.lastName, r.email, date(r.createdAt), r.unsubscribedAt ? "Baja" : "Activo", getLive(r.liveId)?.title ?? ""]
        .map(csvCell)
        .join(";")
    );
  return `﻿${[header.join(";"), ...lines].join("\r\n")}\r\n`;
}

/* ------------------------------------------------------------------ */
/* API simulée (mêmes routes et réponses que le vrai serveur)          */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;
const text = (value, field, max = 200) => {
  const s = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!s || s.length > max) fail(400, `Campo inválido: ${field}`, `invalid_${field}`);
  return s;
};
function futureDate(value) {
  const t = Date.parse(value);
  if (Number.isNaN(t)) fail(400, "Fecha inválida", "invalid_date");
  if (t < Date.now() + MIN) fail(400, "La fecha del live debe estar en el futuro", "past_date");
  return new Date(t).toISOString();
}

export async function handleApi(method, fullPath, body) {
  const [path, query = ""] = fullPath.split("?");
  const params = new URLSearchParams(query);
  const route = `${method} ${path}`;
  let m;

  /* ----- Authentification ----- */
  if (route === "POST /auth/login") {
    if (body?.username?.trim() === ADMIN.username && body?.password === ADMIN.password) {
      db.loggedIn = true;
      uiChanged();
      return { admin: { username: ADMIN.username } };
    }
    fail(401, "Usuario o contraseña incorrectos", "bad_credentials");
  }
  if (route === "POST /auth/logout") {
    db.loggedIn = false;
    for (const s of [...sockets.cockpit]) s._serverDisconnect();
    uiChanged();
    return { ok: true };
  }
  if (route === "GET /auth/me") {
    if (!db.loggedIn) fail(401, "No autorizado", "unauthorized");
    return { admin: { username: ADMIN.username } };
  }

  /* ----- Public ----- */
  if (route === "GET /public/live") return publicStatus();
  if (route === "POST /public/registrations") {
    if (body?.website) return { ok: true };
    const firstName = text(body?.firstName, "nombre", 80);
    const lastName = text(body?.lastName, "apellido", 80);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(email)) fail(400, "Correo electrónico inválido", "invalid_email");
    const live = currentLive() ?? nextScheduled();
    const existing = db.registrations.find((r) => r.email === email);
    if (!existing) {
      const registration = {
        id: nextId(),
        firstName,
        lastName,
        email,
        liveId: live?.id ?? null,
        createdAt: iso(),
        unsubscribedAt: null,
      };
      db.registrations.push(registration);
      confirmationEmail(registration, live);
    } else if (existing.unsubscribedAt) {
      sendEmail({
        registration: existing,
        kind: "resubscribe",
        to: email,
        subject: "Confirma que quieres volver a recibir los avisos de los lives",
        body: `Hola ${existing.firstName}:\n\nPara volver a recibir los avisos de los lives, confirma con el enlace de este correo.`,
      });
    } else if (live && existing.liveId !== live.id) {
      existing.liveId = live.id;
      confirmationEmail(existing, live);
    }
    uiChanged();
    return { ok: true, firstName };
  }

  /* ----- Cockpit (session obligatoire) ----- */
  if (!path.startsWith("/admin/")) fail(404, "No encontrado");
  if (!db.loggedIn) fail(401, "No autorizado", "unauthorized");

  if (route === "GET /admin/overview") {
    const lastLive = db.lives
      .filter((l) => l.status === "ended")
      .sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))[0];
    const ready = db.recordings.filter((r) => r.status === "ready");
    const monthAgo = Date.now() - 30 * 86400_000;
    const recent = db.emails.filter((e) => Date.parse(e.createdAt) >= monthAgo);
    return {
      registrations: {
        total: db.registrations.length,
        active: db.registrations.filter((r) => !r.unsubscribedAt).length,
        last7Days: db.registrations.filter((r) => Date.parse(r.createdAt) >= Date.now() - 7 * 86400_000).length,
      },
      recordings: { count: ready.length, bytes: ready.reduce((sum, r) => sum + r.sizeBytes, 0) },
      nextLive: toAdminLive(nextScheduled()),
      upcomingCount: upcoming().length,
      lastLive: toAdminLive(lastLive),
      emails: { sent: recent.filter((e) => e.status === "sent").length, failed: 0 },
      stats: stats(),
      mail: { mode: "console", from: "Dani Inmigración <no-reply@daniinmigracion.com>", host: null },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      publicUrl: "demo",
      serverNow: Date.now(),
    };
  }

  if (route === "GET /admin/settings") return { settings: { ...db.settings } };
  if (route === "PUT /admin/settings") {
    if (typeof body?.liveSectionEnabled === "boolean") db.settings.liveSectionEnabled = body.liveSectionEnabled;
    if (typeof body?.liveSectionTitle === "string") db.settings.liveSectionTitle = text(body.liveSectionTitle, "título", 80);
    if (typeof body?.liveSectionText === "string") db.settings.liveSectionText = body.liveSectionText.trim().slice(0, 400);
    broadcastStatus();
    return { settings: { ...db.settings } };
  }
  if (route === "POST /admin/mail/test") {
    const to = typeof body?.to === "string" ? body.to.trim() : "";
    if (!EMAIL_RE.test(to)) fail(400, "Correo electrónico inválido", "invalid_email");
    await sendEmail({
      kind: "test",
      to,
      subject: "Prueba de envío · Cockpit Dani Inmigración",
      body: "¡Funciona! La configuración de correo del cockpit está lista (modo demo).",
    });
    return { ok: true, mode: "console" };
  }

  /* Lives */
  if (route === "GET /admin/lives") {
    const past = db.lives
      .filter((l) => ["ended", "cancelled", "missed"].includes(l.status))
      .sort((a, b) => Date.parse(b.startedAt || b.scheduledAt || b.createdAt) - Date.parse(a.startedAt || a.scheduledAt || a.createdAt));
    return { upcoming: upcoming().map(toAdminLive), past: past.map(toAdminLive) };
  }
  if (route === "POST /admin/lives") {
    const live = createLive({
      title: text(body?.title, "título", 120),
      description: typeof body?.description === "string" && body.description.trim() ? body.description.trim() : null,
      scheduledAt: futureDate(body?.scheduledAt),
    });
    broadcastStatus();
    return { live: toAdminLive(live) };
  }
  if ((m = route.match(/^PATCH \/admin\/lives\/(\d+)$/))) {
    const live = getLive(Number(m[1]));
    if (!live || live.status !== "scheduled") fail(404, "Live programado no encontrado");
    const scheduledAt = body?.scheduledAt === undefined ? live.scheduledAt : futureDate(body.scheduledAt);
    if (scheduledAt !== live.scheduledAt) {
      // Reprogrammé : les rappels repartent de zéro.
      db.emails = db.emails.filter((e) => !(e.liveId === live.id && e.kind.startsWith("reminder")));
    }
    Object.assign(live, {
      title: body?.title === undefined ? live.title : text(body.title, "título", 120),
      description: body?.description === undefined ? live.description : body.description?.trim() || null,
      scheduledAt,
    });
    broadcastStatus();
    return { live: toAdminLive(live) };
  }
  if ((m = route.match(/^POST \/admin\/lives\/(\d+)\/cancel$/))) {
    const live = getLive(Number(m[1]));
    if (!live || live.status !== "scheduled") fail(404, "Live programado no encontrado");
    live.status = "cancelled";
    broadcastStatus();
    return { ok: true };
  }
  if (route === "POST /admin/live/end") {
    const ended = endLive("cockpit");
    if (!ended) fail(409, "No hay ningún live en curso");
    return { live: ended };
  }

  /* Enregistrements */
  if (route === "GET /admin/recordings") {
    return {
      recordings: [...db.recordings]
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .map(toRecordingDto),
    };
  }
  if (route === "POST /admin/recordings") {
    const live = getLive(Number(body?.liveId));
    if (!live || live.status !== "live") fail(400, "No hay un live en curso");
    const mimeType = String(body?.mimeType ?? "");
    if (!/^video\/(webm|mp4)/.test(mimeType)) fail(400, "Formato de grabación no soportado");
    // Un seul segment actif par live.
    db.recordings
      .filter((r) => r.liveId === live.id && r.status === "recording")
      .forEach((r) => finishRecording(r.id));
    const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
    const stamp = iso().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
    const rec = {
      id: nextId(),
      liveId: live.id,
      filename: `live-${live.id}-${stamp}.${ext}`,
      mimeType,
      chunks: [],
      nextSeq: 0,
      sizeBytes: 0,
      durationMs: null,
      status: "recording",
      createdAt: iso(),
      finishedAt: null,
      startedAt: Date.now(),
      lastChunkAt: Date.now(),
      url: null,
    };
    db.recordings.push(rec);
    emit("cockpit", "recordings:changed", null);
    return { id: rec.id, filename: rec.filename };
  }
  if ((m = route.match(/^POST \/admin\/recordings\/(\d+)\/chunks$/))) {
    const rec = db.recordings.find((r) => r.id === Number(m[1]));
    if (!rec || rec.status !== "recording" || rec.finishing) fail(404, "Grabación cerrada", "recording_closed");
    const seq = Number.parseInt(params.get("seq"), 10);
    if (seq < rec.nextSeq) return { bytes: rec.sizeBytes, duplicate: true };
    if (seq > rec.nextSeq) fail(409, "Fragmento fuera de orden", "out_of_order");
    if (body instanceof Blob && body.size) rec.chunks.push(body);
    rec.nextSeq += 1;
    rec.sizeBytes += body instanceof Blob ? body.size : 0;
    rec.lastChunkAt = Date.now();
    return { bytes: rec.sizeBytes };
  }
  if ((m = route.match(/^POST \/admin\/recordings\/(\d+)\/finish$/))) {
    return { recording: await finishRecording(Number(m[1]), Number(body?.durationMs)) };
  }
  if ((m = route.match(/^DELETE \/admin\/recordings\/(\d+)$/))) {
    const rec = db.recordings.find((r) => r.id === Number(m[1]));
    if (!rec) fail(404, "Grabación no encontrada");
    if (rec.status === "recording") fail(409, "La grabación sigue en curso");
    if (rec.url) URL.revokeObjectURL(rec.url);
    db.recordings = db.recordings.filter((r) => r !== rec);
    emit("cockpit", "recordings:changed", null);
    return { ok: true };
  }

  /* Inscrits et envois */
  if (route === "GET /admin/registrations") {
    return {
      registrations: [...db.registrations]
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .map(registrationDto),
    };
  }
  if ((m = route.match(/^DELETE \/admin\/registrations\/(\d+)$/))) {
    const before = db.registrations.length;
    db.registrations = db.registrations.filter((r) => r.id !== Number(m[1]));
    if (db.registrations.length === before) fail(404, "Inscrito no encontrado");
    uiChanged();
    return { ok: true };
  }
  if (route === "POST /admin/notify") {
    const ids = [...new Set((body?.registrationIds ?? []).map(Number))];
    if (!ids.length) fail(400, "Selecciona al menos un destinatario");
    const subject = text(body?.subject, "asunto", 150);
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) fail(400, "El mensaje no puede estar vacío");
    const recipients = db.registrations.filter((r) => ids.includes(r.id) && !r.unsubscribedAt);
    const batchId = `batch-${nextId()}`;
    const liveId = (currentLive() ?? nextScheduled())?.id ?? null;

    // Envoi un par un, avec la progression en temps réel (comme le vrai serveur).
    (async () => {
      let sent = 0;
      for (const r of recipients) {
        const email = await sendEmail(
          { registration: r, liveId, kind: "manual", batchId, to: r.email, subject, body: message.replace(/\{nombre\}/gi, r.firstName) },
          rand(350, 800)
        );
        sent += 1;
        emit("cockpit", "mail:progress", {
          batchId,
          registrationId: r.id,
          logId: email.id,
          status: "sent",
          error: null,
          sentAt: email.sentAt,
        });
      }
      emit("cockpit", "mail:done", { batchId, total: recipients.length, sent, failed: 0 });
    })();

    return {
      batchId,
      total: recipients.length,
      skipped: ids.length - recipients.length,
      recipients: recipients.map((r) => ({ registrationId: r.id, logId: null })),
    };
  }
  if ((m = route.match(/^GET \/admin\/notify\/(.+)$/))) {
    return {
      results: db.emails
        .filter((e) => e.batchId === m[1])
        .map((e) => ({ logId: e.id, registrationId: e.registrationId, email: e.to, status: e.status, error: null, sentAt: e.sentAt })),
    };
  }

  fail(404, "No encontrado");
}

/** URL d'un fichier de l'API : les vidéos enregistrées sont servies depuis la mémoire. */
export function fileUrl(path) {
  const m = path.match(/^\/admin\/recordings\/(\d+)\/file$/);
  if (m) return db.recordings.find((r) => r.id === Number(m[1]))?.url ?? "";
  return `/api${path}`;
}

/** Fichier à télécharger pour un lien /api/... (export CSV, enregistrement). */
export function getDownload(apiPath) {
  const [path] = apiPath.replace(/^\/api/, "").split("?");
  if (path === "/admin/registrations.csv") {
    return { filename: `inscritos-live-${iso().slice(0, 10)}.csv`, data: registrationsCsv() };
  }
  const m = path.match(/^\/admin\/recordings\/(\d+)\/file$/);
  const rec = m && db.recordings.find((r) => r.id === Number(m[1]));
  if (rec?.blob) return { filename: rec.filename, data: rec.blob };
  return null;
}

/* ------------------------------------------------------------------ */
/* Accès pour l'interface de démo                                      */
/* ------------------------------------------------------------------ */

export const outbox = () => [...db.emails].reverse();
export const isLoggedIn = () => db.loggedIn;

export function setAudience(on) {
  demo.audience = on;
  audienceTick();
  uiChanged();
}

/* ------------------------------------------------------------------ */
/* Données d'exemple et minuteurs                                      */
/* ------------------------------------------------------------------ */

function seed() {
  const now = Date.now();
  const at = (days, hour, minute = 0) => {
    const d = new Date(now + days * 86400_000);
    d.setHours(hour, minute, 0, 0);
    return d.getTime();
  };

  const past = createLive({ title: "Cómo preparar la entrevista de ciudadanía", scheduledAt: iso(at(-6, 19)) });
  Object.assign(past, {
    status: "ended",
    startedAt: iso(at(-6, 19, 2)),
    endedAt: iso(at(-6, 19, 58)),
    hearts: 1284,
    peakViewers: 37,
    totalViewers: 52,
    createdAt: iso(at(-9, 10)),
  });
  // Commence dans 4 min 30 : le chronomètre 05:00 → 00:00 est visible tout de suite.
  const soon = createLive({ title: "Preguntas y respuestas sobre la Green Card", scheduledAt: iso(now + 4.5 * MIN) });
  createLive({ title: "Visas de trabajo H-1B: lo que cambia este año", scheduledAt: iso(now + 2 * HOUR + 10 * MIN) });
  createLive({ title: "Reunificación familiar paso a paso", scheduledAt: iso(at(3, 19)) });

  const people = [
    ["María", "López", "maria.lopez@example.com", 9],
    ["José", "Hernández", "jose.hernandez@example.com", 7],
    ["Ana", "García", "ana.garcia@example.com", 5],
    ["Luis", "Pérez", "luis.perez@example.com", 4],
    ["Carmen", "Rodríguez", "carmen.rodriguez@example.com", 2],
    ["Diego", "Martínez", "diego.martinez@example.com", 8],
  ];
  for (const [firstName, lastName, email, daysAgo] of people) {
    const registration = {
      id: nextId(),
      firstName,
      lastName,
      email,
      liveId: soon.id,
      createdAt: iso(now - daysAgo * 86400_000 - rand(0, 8) * HOUR),
      unsubscribedAt: email.startsWith("diego") ? iso(now - 86400_000) : null,
    };
    db.registrations.push(registration);
    db.emails.push({
      id: nextId(),
      registrationId: registration.id,
      liveId: soon.id,
      kind: "confirmation",
      batchId: null,
      to: email,
      subject: `¡Inscripción confirmada! Live con Dani el ${shortDate(soon.scheduledAt)}`,
      body: `¡Hola ${firstName}!\n\nTu lugar para el live «${soon.title}» está reservado.`,
      status: "sent",
      error: null,
      createdAt: registration.createdAt,
      sentAt: registration.createdAt,
    });
  }
}

seed();
setInterval(flushHearts, 250);
setInterval(simulatedHeartsTick, 450);
setInterval(audienceTick, 1500);
setInterval(remindersTick, 5000);
setTimeout(remindersTick, 1500);
