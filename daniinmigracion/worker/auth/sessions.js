/**
 * Sessions du cockpit, stockées en base.
 *
 * Le cookie contient un jeton aléatoire de 256 bits ; la base ne garde que son
 * hash SHA-256 (une fuite de la base ne permet donc pas de voler une session).
 */
import { config } from "../config.js";
import { db } from "../db.js";
import { randomToken, sha256Hex } from "../lib/crypto.js";
import { readCookie, serializeCookie } from "../lib/http.js";

export function hashToken(token) {
  return sha256Hex(token);
}

/** Crée une session et retourne le jeton brut (à placer dans le cookie). */
export async function createSession(username, { ip, userAgent } = {}) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + config.session.ttlHours * 3600_000).toISOString();
  db.prepare(
    "INSERT INTO sessions (token_hash, username, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)"
  ).run(await hashToken(token), username, ip ?? null, userAgent?.slice(0, 300) ?? null, expiresAt);
  return token;
}

/** Retourne `{ tokenHash, admin }` si le jeton est valide et non expiré, sinon `null`. */
export async function findSession(token) {
  if (!token || typeof token !== "string" || token.length > 100) return null;
  const tokenHash = await hashToken(token);
  const row = db.prepare("SELECT username, expires_at FROM sessions WHERE token_hash = ?").get(tokenHash);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
    return null;
  }
  return { tokenHash, admin: { username: row.username } };
}

/** Session de la requête (cookie), ou `null`. */
export function sessionFromRequest(request) {
  return findSession(readCookie(request.headers.get("cookie"), config.session.cookieName));
}

/** Vérifie qu'une session (identifiée par le hash du jeton) existe et n'a pas expiré. */
export function isSessionValid(tokenHash) {
  const row = db.prepare("SELECT expires_at FROM sessions WHERE token_hash = ?").get(tokenHash);
  return Boolean(row) && new Date(row.expires_at).getTime() > Date.now();
}

export function deleteSession(tokenHash) {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

/** Supprime les sessions expirées (appelé périodiquement). */
export function purgeExpiredSessions() {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString());
}

/** Cookie `Secure` : forcé par COOKIE_SECURE, sinon dès que la requête est en HTTPS. */
function isSecure(request) {
  const mode = config.session.cookieSecure;
  if (mode === "true") return true;
  if (mode === "false") return false;
  return new URL(request.url).protocol === "https:";
}

/** En-tête `Set-Cookie` de connexion : HttpOnly, SameSite=Strict et Secure en HTTPS. */
export function sessionCookie(request, token) {
  return serializeCookie(config.session.cookieName, token, {
    maxAge: config.session.ttlHours * 3600,
    secure: isSecure(request),
  });
}

/** En-tête `Set-Cookie` de déconnexion. */
export function clearSessionCookie(request) {
  return serializeCookie(config.session.cookieName, "", { maxAge: 0, secure: isSecure(request) });
}
