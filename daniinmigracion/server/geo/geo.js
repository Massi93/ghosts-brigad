/**
 * Géolocalisation approximative (ville / pays) d'une adresse IP.
 *
 * - IP locale (127.0.0.1, ::1) ou privée (192.168.x.x…) : pas de requête externe.
 * - Sinon, interrogation du fournisseur configuré (GEO_PROVIDER) avec un cache
 *   de 24 h et un délai max de 3 s : la géolocalisation ne bloque jamais le live.
 */
import net from "node:net";
import { config } from "../config.js";

const CACHE_TTL_MS = 24 * 3600_000;
const cache = new Map(); // ip -> { value, expires }
const inflight = new Map(); // ip -> Promise

const UNKNOWN = { city: null, country: null, countryCode: null, label: "Ubicación desconocida" };

function isLoopback(ip) {
  return ip === "::1" || ip.startsWith("127.") || ip === "localhost";
}

function isPrivate(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127) // CGNAT
    );
  }
  const lower = ip.toLowerCase();
  return lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

/** Masque la fin de l'IP pour l'affichage (protection de la vie privée). */
export function maskIp(ip) {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".");
    return `${parts[0]}.${parts[1]}.x.x`;
  }
  if (net.isIPv6(ip)) {
    return `${ip.split(":").slice(0, 2).join(":")}:…`;
  }
  return "—";
}

/** Libellé lisible « Ville, Pays ». */
function label(city, country) {
  return [city, country].filter(Boolean).join(", ") || UNKNOWN.label;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(3000),
    headers: { "User-Agent": "dani-inmigracion-live/1.0" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Appelle le fournisseur configuré et retourne `{ city, country, countryCode }`. */
async function lookupRemote(ip) {
  switch (config.geo.provider) {
    case "ipapi": {
      const data = await fetchJson(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
      if (data.error) throw new Error(data.reason || "ipapi error");
      return { city: data.city, country: data.country_name, countryCode: data.country_code };
    }
    case "ip-api": {
      const data = await fetchJson(
        `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,city&lang=es`
      );
      if (data.status !== "success") throw new Error(data.message || "ip-api error");
      return { city: data.city, country: data.country, countryCode: data.countryCode };
    }
    default:
      return null;
  }
}

/**
 * Localise une IP. Ne lève jamais d'erreur : en cas d'échec,
 * retourne « Ubicación desconocida ».
 */
export async function locateIp(ip) {
  if (!ip) return UNKNOWN;
  if (isLoopback(ip)) {
    return { city: null, country: null, countryCode: null, label: "Local (este equipo)" };
  }
  if (isPrivate(ip)) {
    return { city: null, country: null, countryCode: null, label: "Red local" };
  }
  if (config.geo.provider === "none") return UNKNOWN;

  const cached = cache.get(ip);
  if (cached && cached.expires > Date.now()) return cached.value;
  if (inflight.has(ip)) return inflight.get(ip);

  const promise = lookupRemote(ip)
    .then((geo) => {
      const value = geo
        ? { ...geo, label: label(geo.city, geo.country) }
        : UNKNOWN;
      cache.set(ip, { value, expires: Date.now() + CACHE_TTL_MS });
      return value;
    })
    .catch((err) => {
      console.warn(`[geo] Échec de géolocalisation (${maskIp(ip)}) : ${err.message}`);
      return UNKNOWN;
    })
    .finally(() => inflight.delete(ip));

  inflight.set(ip, promise);
  return promise;
}

/** Type d'appareil et navigateur déduits du User-Agent (affichage cockpit). */
export function describeDevice(userAgent = "") {
  const ua = String(userAgent);
  const device = /iPad|Tablet/i.test(ua)
    ? "Tablet"
    : /Mobi|Android|iPhone/i.test(ua)
      ? "Móvil"
      : "Ordenador";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Navegador";
  return { device, browser };
}
