/**
 * Point d'entrée du serveur Dani Inmigración (site + API + cockpit + temps réel).
 *
 *  npm run dev    → développement : Vite est intégré (rechargement à chaud)
 *  npm run build  → compile le site dans dist/
 *  npm start      → sert la version compilée (dist/)
 *
 * Tout tourne sur un seul port : http://localhost:3000 (site, /live, /cockpit, API, WebSocket).
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import express from "express";
import { Server } from "socket.io";

import { config, ROOT_DIR } from "./config.js";
import { openDatabase } from "./db/index.js";
import { ensureDefaultAdmin, usesDocumentedPassword } from "./auth/admins.js";
import { purgeExpiredSessions } from "./auth/sessions.js";
import { cockpitPageGuard, loadSession, publicCors, requireAdmin, sameOriginOnly } from "./auth/middleware.js";
import { authRouter } from "./auth/routes.js";
import { errorHandler } from "./lib/http.js";
import { adminRouter } from "./admin/routes.js";
import { adminLiveRouter, publicLiveRouter } from "./live/routes.js";
import { setupSockets } from "./live/sockets.js";
import * as live from "./live/liveService.js";
import { finishAllActive, recoverInterruptedRecordings, startIdleSweeper } from "./live/recordings.js";
import { refreshIceServers } from "./live/iceServers.js";
import { adminRegistrationsRouter, publicRegistrationsRouter } from "./registrations/routes.js";
import { initMailer } from "./mail/mailer.js";
import { mailEvents } from "./mail/notifications.js";
import { startReminderScheduler } from "./mail/reminders.js";

/* ----------------------------- Initialisation ----------------------------- */

openDatabase();
await ensureDefaultAdmin();
if (await usesDocumentedPassword()) {
  console.warn(
    `[auth] ⚠️  Le cockpit utilise le mot de passe par défaut. Avant toute mise en ligne : npm run cockpit:password -- "nouveau-mot-de-passe"`
  );
}
purgeExpiredSessions();
setInterval(purgeExpiredSessions, 3600_000).unref();
recoverInterruptedRecordings();
startIdleSweeper();
live.restoreAfterRestart();
initMailer();
refreshIceServers(); // relais TURN Cloudflare si configurés

const app = express();
app.disable("x-powered-by");
// Derrière un reverse proxy (TRUST_PROXY=true) : on fait confiance à un seul saut.
app.set("trust proxy", config.trustProxy ? 1 : false);

const server = http.createServer(app);
const io = new Server(server, {
  serveClient: false,
  maxHttpBufferSize: 256 * 1024, // messages de signalisation uniquement (la vidéo ne passe pas par ici)
  destroyUpgrade: false, // laisse Vite gérer son propre WebSocket de rechargement à chaud
});
const sockets = setupSockets(io);

// Progression des envois d'emails manuels → cockpit en temps réel.
mailEvents.on("progress", (data) => sockets.emitToCockpit("mail:progress", data));
mailEvents.on("done", (data) => sockets.emitToCockpit("mail:done", data));

/* ------------------------------ En-têtes HTTP ------------------------------ */

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  // Caméra et micro autorisés uniquement pour ce site (le cockpit).
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  next();
});

app.use(loadSession);

/* ----------------------------------- API ----------------------------------- */

const api = express.Router();
api.use(sameOriginOnly);
api.use(express.json({ limit: "100kb" }));
api.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

api.use("/auth", authRouter({ onLogout: (tokenHash) => sockets.disconnectSession(tokenHash) }));
api.use("/public", publicCors, publicLiveRouter(), publicRegistrationsRouter());
api.use("/admin", requireAdmin, adminRouter(), adminLiveRouter(), adminRegistrationsRouter());
api.use((_req, res) => res.status(404).json({ error: "No encontrado" }));
api.use(errorHandler);
app.use("/api", api);

/* --------------------------------- Pages ---------------------------------- */

// /cockpit → redirection vers /cockpit/login si la session est absente.
app.use(cockpitPageGuard);

// Live sur son propre sous-domaine : la page d'accueil est celle du site principal.
if (config.mainSiteUrl) {
  app.get(["/", "/index.html"], (_req, res) => res.redirect(302, `${config.mainSiteUrl}/`));
}

if (config.isProd) {
  const indexHtml = path.join(config.paths.dist, "index.html");
  if (!fs.existsSync(indexHtml)) {
    console.error("dist/ est introuvable : lance d'abord `npm run build`.");
    process.exit(1);
  }
  app.use(express.static(config.paths.dist, { index: false, maxAge: "1h" }));
  // Application monopage : toutes les autres routes renvoient index.html.
  app.get("/{*path}", (_req, res) => res.sendFile(indexHtml));
} else {
  // Développement : Vite en mode middleware (rechargement à chaud sur le même port).
  const { createServer } = await import("vite");
  const vite = await createServer({
    root: ROOT_DIR,
    appType: "spa",
    server: { middlewareMode: true, hmr: { server } },
  });
  app.use(vite.middlewares);
}

app.use(errorHandler);

/* -------------------------------- Démarrage -------------------------------- */

startReminderScheduler({ onLivesChanged: () => live.events.emit("status") });

server.listen(config.port, config.host, () => {
  const base = `http://${config.host === "0.0.0.0" ? "localhost" : config.host}:${config.port}`;
  console.log("");
  console.log(`  🌐 Site        ${base}`);
  console.log(`  🔴 Live        ${base}/live`);
  console.log(`  🎛️  Cockpit     ${base}/cockpit   (identifiant : ${config.admin.username})`);
  console.log(`  ✉️  Emails      mode ${config.mail.mode}`);
  console.log(`  🧩 Mode        ${config.isProd ? "production (dist/)" : "développement (Vite)"}`);
  console.log("");
});

// Arrêt propre (Ctrl+C) : les fichiers d'enregistrement sont fermés correctement.
// Un live en cours reste ouvert en base et sera restauré au prochain démarrage.
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  setTimeout(() => process.exit(0), 5000).unref();
  await finishAllActive();
  io.close();
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
