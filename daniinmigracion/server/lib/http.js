/**
 * Utilitaires HTTP communs : erreurs typées, validation, IP du client.
 */
import { config } from "../config.js";

/** Erreur renvoyée telle quelle au client avec son code HTTP. */
export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Middleware Express de gestion des erreurs (dernier `app.use`). */
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  // Corps JSON invalide ou trop gros (body-parser).
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON inválido" });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Contenido demasiado grande" });
  }
  console.error("[http] Erreur inattendue :", err);
  res.status(500).json({ error: "Error interno del servidor" });
}

/** Chaîne nettoyée et bornée, ou `HttpError 400` si absente/invalide. */
export function requireString(value, field, { min = 1, max = 200 } = {}) {
  const str = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (str.length < min || str.length > max) {
    throw new HttpError(400, `Campo inválido: ${field}`, `invalid_${field}`);
  }
  return str;
}

/** Texte optionnel (multi-lignes conservées). */
export function optionalText(value, max = 5000) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new HttpError(400, "Texto inválido");
  const str = value.trim();
  if (str.length > max) throw new HttpError(400, "Texto demasiado largo");
  return str || null;
}

const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;

/** Email normalisé (minuscules) ou `HttpError 400`. */
export function requireEmail(value) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    throw new HttpError(400, "Correo electrónico inválido", "invalid_email");
  }
  return email;
}

/** Date ISO valide (chaîne) ou `HttpError 400`. */
export function requireDate(value, field = "fecha") {
  const date = new Date(value);
  if (typeof value !== "string" || Number.isNaN(date.getTime())) {
    throw new HttpError(400, `Fecha inválida: ${field}`, "invalid_date");
  }
  return date;
}

/** Identifiant numérique positif (paramètre d'URL). */
export function requireId(value) {
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Identificador inválido");
  return id;
}

/** Normalise une adresse IP (retire le préfixe IPv4-mapped `::ffff:`). */
export function normalizeIp(ip) {
  if (!ip) return "";
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

/**
 * IP du client à partir d'en-têtes bruts + adresse socket.
 * `X-Forwarded-For` n'est lu que si TRUST_PROXY=true (un seul reverse proxy) :
 * on prend la DERNIÈRE adresse, celle ajoutée par le proxy, car les précédentes
 * peuvent être inventées par le client.
 */
export function clientIpFrom(headers, remoteAddress) {
  if (config.trustProxy) {
    const forwarded = headers["x-forwarded-for"];
    const last =
      typeof forwarded === "string"
        ? forwarded.split(",").map((part) => part.trim()).filter(Boolean).at(-1)
        : null;
    if (last) return normalizeIp(last);
  }
  return normalizeIp(remoteAddress);
}

/** IP du client d'une requête Express. */
export function clientIp(req) {
  return clientIpFrom(req.headers, req.socket.remoteAddress);
}
