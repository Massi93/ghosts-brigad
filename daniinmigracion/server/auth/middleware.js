/**
 * Middlewares de protection du cockpit.
 */
import { config } from "../config.js";
import { findSession, tokenFromCookieHeader } from "./sessions.js";

/** Attache `req.session` ({ tokenHash, admin }) si le cookie est valide. */
export function loadSession(req, _res, next) {
  req.session = findSession(tokenFromCookieHeader(req.headers.cookie));
  next();
}

/** API admin : 401 JSON si non connecté. */
export function requireAdmin(req, res, next) {
  if (!req.session) {
    return res.status(401).json({ error: "No autorizado", code: "unauthorized" });
  }
  next();
}

/**
 * Protection CSRF complémentaire au cookie SameSite=Strict :
 * toute requête qui modifie des données doit venir de la même origine.
 */
export function sameOriginOnly(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin) {
    let host;
    try {
      host = new URL(origin).host;
    } catch {
      host = null;
    }
    const allowed = new Set([req.headers.host, new URL(config.publicUrl).host]);
    if (!host || !allowed.has(host)) {
      return res.status(403).json({ error: "Origen no permitido", code: "bad_origin" });
    }
  }
  next();
}

/**
 * Pages HTML du cockpit : redirige vers `/cockpit/login` si non connecté,
 * et vers `/cockpit` si l'on ouvre la page de login en étant déjà connecté.
 */
export function cockpitPageGuard(req, res, next) {
  if (req.method !== "GET") return next();
  const path = req.path.replace(/\/+$/, "") || "/";
  if (path !== "/cockpit" && !path.startsWith("/cockpit/")) return next();

  const isLoginPage = path === "/cockpit/login";
  if (isLoginPage && req.session) return res.redirect(302, "/cockpit");
  if (!isLoginPage && !req.session) {
    const nextUrl = encodeURIComponent(req.originalUrl);
    return res.redirect(302, `/cockpit/login?next=${nextUrl}`);
  }
  // Les pages du cockpit ne doivent jamais être mises en cache.
  res.setHeader("Cache-Control", "no-store");
  next();
}
