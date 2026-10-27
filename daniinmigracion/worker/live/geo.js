/**
 * Localisation approximative (ville / pays) et appareil des viewers.
 *
 * Cloudflare fournit gratuitement la géolocalisation de chaque visiteur
 * (`request.cf`) : aucun service externe n'est appelé.
 */

const regionNames = new Intl.DisplayNames(["es"], { type: "region" });

function isLoopback(ip) {
  return ip === "::1" || ip.startsWith("127.") || ip === "localhost";
}

function isPrivate(ip) {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
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
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    const parts = ip.split(".");
    return `${parts[0]}.${parts[1]}.x.x`;
  }
  if (ip.includes(":")) return `${ip.split(":").slice(0, 2).join(":")}:…`;
  return "—";
}

function countryName(code) {
  if (!code || code === "XX" || code === "T1") return null;
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * Localisation d'une requête (ou de l'ouverture d'un WebSocket).
 * @returns {{ city: string|null, country: string|null, countryCode: string|null, label: string }}
 */
export function locateRequest(request, ip) {
  if (isLoopback(ip)) return { city: null, country: null, countryCode: null, label: "Local (este equipo)" };
  if (isPrivate(ip)) return { city: null, country: null, countryCode: null, label: "Red local" };
  const cf = request.cf ?? {};
  const countryCode = cf.country || request.headers.get("cf-ipcountry") || null;
  const city = cf.city || null;
  const country = countryName(countryCode);
  return {
    city,
    country,
    countryCode: country ? countryCode : null,
    label: [city, country].filter(Boolean).join(", ") || "Ubicación desconocida",
  };
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
