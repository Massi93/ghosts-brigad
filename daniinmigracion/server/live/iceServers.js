/**
 * Serveurs ICE (STUN / TURN) donnés aux navigateurs pour établir la vidéo WebRTC.
 *
 * - ICE_SERVERS : liste fixe (STUN publics), suffisante pour la plupart des réseaux.
 * - CLOUDFLARE_TURN_KEY_ID + CLOUDFLARE_TURN_API_TOKEN : ajoute les relais TURN de
 *   Cloudflare, indispensables pour les viewers derrière des réseaux restrictifs
 *   (certains opérateurs 4G, réseaux d'entreprise). Les identifiants sont générés
 *   par l'API Cloudflare, gardés en cache et renouvelés avant expiration.
 */
import { config } from "../config.js";

const TTL_SECONDS = 12 * 3600; // un live dure bien moins : la connexion reste valable
const RENEW_BEFORE_MS = 6 * 3600_000;

let current = config.live.iceServers;
let expiresAt = 0;
let refreshing = null;

/** Serveurs ICE à transmettre maintenant (jamais bloquant). */
export function getIceServers() {
  if (turnConfigured() && Date.now() > expiresAt - RENEW_BEFORE_MS) refreshIceServers();
  return current;
}

function turnConfigured() {
  const { keyId, apiToken } = config.live.cloudflareTurn;
  return Boolean(keyId && apiToken);
}

/** Demande de nouveaux identifiants TURN à Cloudflare (une seule requête à la fois). */
export function refreshIceServers() {
  if (!turnConfigured() || refreshing) return refreshing;
  const { keyId, apiToken } = config.live.cloudflareTurn;
  refreshing = (async () => {
    try {
      const response = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ttl: TTL_SECONDS }),
          signal: AbortSignal.timeout(5000),
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      // L'API renvoie un tableau (generate-ice-servers) ; les anciennes versions, un objet.
      const list = Array.isArray(data.iceServers) ? data.iceServers : data.iceServers ? [data.iceServers] : [];
      const servers = list
        .map((server) => ({
          ...server,
          // Le port 53 est bloqué par certains navigateurs : on l'écarte.
          urls: (Array.isArray(server.urls) ? server.urls : [server.urls]).filter(
            (url) => typeof url === "string" && !/:53(\?|$)/.test(url)
          ),
        }))
        .filter((server) => server.urls.length);
      if (!servers.some((s) => s.urls.some((u) => u.startsWith("turn")))) throw new Error("aucun relais TURN reçu");

      current = [...config.live.iceServers, ...servers];
      expiresAt = Date.now() + TTL_SECONDS * 1000;
      console.log("[turn] Relais TURN Cloudflare prêts.");
    } catch (err) {
      console.warn(`[turn] Identifiants TURN indisponibles (${err.message}) : STUN seul.`);
      expiresAt = Date.now() + RENEW_BEFORE_MS + 10 * 60_000; // nouvel essai dans ~10 min
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}
