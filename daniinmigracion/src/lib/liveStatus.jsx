/**
 * État public du live partagé par le site (bouton LIVE, rubrique « Próximo live »)
 * et la page /live. Mis à jour en temps réel via WebSocket.
 */
import { createContext, useContext, useEffect, useState } from "react";
import { getPublicSocket } from "./socket";

const LiveStatusContext = createContext({
  live: null,
  site: null,
  offset: 0,
  loaded: false,
  connected: false,
});

export function LiveStatusProvider({ children }) {
  const [state, setState] = useState({
    live: null,
    site: null,
    offset: 0,
    loaded: false,
    connected: false,
  });

  useEffect(() => {
    const socket = getPublicSocket();
    const onStatus = (payload) =>
      setState({
        live: payload.live,
        site: payload.site,
        // Décalage horloge serveur / navigateur pour des comptes à rebours justes.
        offset: payload.serverNow - Date.now(),
        loaded: true,
        connected: true,
      });
    const onDisconnect = () => setState((s) => ({ ...s, connected: false }));
    socket.on("live:status", onStatus);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("live:status", onStatus);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return <LiveStatusContext.Provider value={state}>{children}</LiveStatusContext.Provider>;
}

/** `{ live, site, offset, loaded, connected }` */
export function useLiveStatus() {
  return useContext(LiveStatusContext);
}

/**
 * Phase d'affichage d'un live à l'instant `now` (horloge serveur) :
 *  - "none"      : aucun live programmé
 *  - "scheduled" : programmé, plus de 5 min avant le début
 *  - "countdown" : dans les 5 dernières minutes (chronomètre 05:00 → 00:00)
 *  - "ready"     : heure atteinte, en attente de Dani
 *  - "live"      : en direct
 */
export function livePhase(live, now) {
  if (!live) return { phase: "none", remaining: 0 };
  if (live.status === "live") return { phase: "live", remaining: 0 };
  const start = live.scheduledAt ? Date.parse(live.scheduledAt) : now;
  const remaining = start - now;
  if (remaining <= 0) return { phase: "ready", remaining: 0 };
  if (remaining <= 5 * 60_000) return { phase: "countdown", remaining };
  return { phase: "scheduled", remaining };
}
