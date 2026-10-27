/**
 * Utilitaires HTTP communs : erreurs typées, réponses JSON, validation,
 * mini-routeur, cookies et IP du client.
 */

/** Erreur renvoyée telle quelle au client avec son code HTTP. */
export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** En-têtes de sécurité ajoutés à toutes les réponses. */
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "SAMEORIGIN",
  // Caméra et micro autorisés uniquement pour ce site (le cockpit).
  "Permissions-Policy": "camera=(self), microphone=(self), geolocation=()",
};

/** Réponse JSON (jamais mise en cache). */
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

/** Petite page HTML. */
export function html(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}

/** Convertit une erreur en réponse JSON. */
export function errorResponse(err) {
  if (err instanceof HttpError) return json({ error: err.message, code: err.code }, err.status);
  console.error("[http] Erreur inattendue :", err?.stack || err);
  return json({ error: "Error interno del servidor" }, 500);
}

/** Lit le corps JSON d'une requête (100 Ko max). */
export async function readJson(request, limit = 100 * 1024) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > limit) throw new HttpError(413, "Contenido demasiado grande");
  const text = await request.text();
  if (text.length > limit) throw new HttpError(413, "Contenido demasiado grande");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "JSON inválido");
  }
}

/** Lit un corps binaire (morceau de vidéo) avec une taille max. */
export async function readBinary(request, limit) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > limit) throw new HttpError(413, "Contenido demasiado grande");
  const buffer = await request.arrayBuffer();
  if (buffer.byteLength > limit) throw new HttpError(413, "Contenido demasiado grande");
  return buffer;
}

/* ------------------------------ Validation ------------------------------ */

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
  if (!Number.isInteger(id) || id <= 0 || String(id) !== String(value)) {
    throw new HttpError(400, "Identificador inválido");
  }
  return id;
}

/* ------------------------------- Routeur -------------------------------- */

/**
 * Mini-routeur : `router.add("GET", "/admin/lives/:id", handler)`.
 * Le handler reçoit `(ctx)` avec `ctx.params`, `ctx.request`, `ctx.url`…
 */
export function createRouter() {
  const routes = [];
  return {
    add(method, pattern, handler) {
      const keys = [];
      const regex = new RegExp(
        `^${pattern.replace(/[.]/g, "\\.").replace(/:(\w+)/g, (_, key) => {
          keys.push(key);
          return "([^/]+)";
        })}$`
      );
      routes.push({ method, regex, keys, handler });
    },
    /** Retourne `{ handler, params }` ou `null` ; `methodNotAllowed` si seul le verbe diffère. */
    match(method, path) {
      let pathMatched = false;
      for (const route of routes) {
        const m = path.match(route.regex);
        if (!m) continue;
        pathMatched = true;
        if (route.method !== method && !(method === "HEAD" && route.method === "GET")) continue;
        const params = {};
        route.keys.forEach((key, i) => {
          params[key] = decodeURIComponent(m[i + 1]);
        });
        return { handler: route.handler, params };
      }
      return pathMatched ? { methodNotAllowed: true } : null;
    },
  };
}

/* ------------------------------- Cookies -------------------------------- */

/** Lit un cookie dans un en-tête `Cookie` brut. */
export function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Construit un en-tête `Set-Cookie`. */
export function serializeCookie(name, value, { maxAge, secure, httpOnly = true, sameSite = "Strict", path = "/" } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  if (maxAge !== undefined) {
    parts.push(`Max-Age=${Math.floor(maxAge)}`);
    if (maxAge <= 0) parts.push("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  }
  return parts.join("; ");
}

/* --------------------------------- IP ----------------------------------- */

/**
 * IP du client. Derrière Cloudflare, `CF-Connecting-IP` est posé par Cloudflare
 * lui-même (le visiteur ne peut pas le falsifier).
 */
export function clientIp(request) {
  return (request.headers.get("cf-connecting-ip") || "").trim() || "127.0.0.1";
}

/** L'origine (en-tête Origin) est-elle ce site lui-même ? */
export function isOwnOrigin(origin, request) {
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
