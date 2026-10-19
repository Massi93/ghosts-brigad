/**
 * Sessions du cockpit, stockées en base.
 *
 * Le cookie contient un jeton aléatoire de 256 bits ; la base ne garde que son
 * hash SHA-256 (une fuite de la base ne permet donc pas de voler une session).
 */
import crypto from "node:crypto";
import { parseCookie } from "cookie";
import { db } from "../db/index.js";
import { config } from "../config.js";

const { cookieName, ttlHours, cookieSecure } = config.session;

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Crée une session et retourne le jeton brut (à placer dans le cookie). */
export function createSession(adminId, { ip, userAgent } = {}) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlHours * 3600_000).toISOString();
  db.prepare(
    "INSERT INTO sessions (token_hash, admin_id, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)"
  ).run(hashToken(token), adminId, ip ?? null, userAgent?.slice(0, 300) ?? null, expiresAt);
  return token;
}

/** Retourne `{ tokenHash, admin }` si le jeton est valide et non expiré, sinon `null`. */
export function findSession(token) {
  if (!token || typeof token !== "string" || token.length > 100) return null;
  const tokenHash = hashToken(token);
  const row = db
    .prepare(
      `SELECT s.token_hash, s.expires_at, a.id AS admin_id, a.username
         FROM sessions s JOIN admins a ON a.id = s.admin_id
        WHERE s.token_hash = ?`
    )
    .get(tokenHash);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
    return null;
  }
  return { tokenHash, admin: { id: row.admin_id, username: row.username } };
}

export function deleteSession(tokenHash) {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

/** Supprime les sessions expirées (appelé périodiquement). */
export function purgeExpiredSessions() {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString());
}

/** Lit le jeton de session dans un en-tête `Cookie` brut. */
export function tokenFromCookieHeader(header) {
  if (!header) return null;
  return parseCookie(header)[cookieName] ?? null;
}

/** Options du cookie : HttpOnly, SameSite=Strict et Secure en HTTPS. */
function cookieOptions(req) {
  const secure =
    cookieSecure === "true" ? true : cookieSecure === "false" ? false : req.secure;
  return {
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: "/",
  };
}

export function setSessionCookie(req, res, token) {
  res.cookie(cookieName, token, { ...cookieOptions(req), maxAge: ttlHours * 3600_000 });
}

export function clearSessionCookie(req, res) {
  res.clearCookie(cookieName, cookieOptions(req));
}
