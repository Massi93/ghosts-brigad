/**
 * État partagé du cockpit : connexion temps réel + diffusion caméra.
 *
 * La diffusion vit ici (et non dans la section « Directo ») pour que le live
 * continue quand Dani navigue entre les sections du tableau de bord.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createCockpitSocket } from "../lib/socket";
import { useBroadcaster } from "./useBroadcaster";

const CockpitContext = createContext(null);

const INITIAL = {
  connected: false,
  live: null,
  next: null,
  broadcasterSocketId: null,
  interruptedSince: null,
  graceSeconds: 0,
  stats: { viewers: 0, peakViewers: 0, totalViewers: 0, hearts: 0 },
  viewers: [],
  iceServers: [],
  offset: 0,
};

export function CockpitProvider({ children }) {
  const socket = useMemo(() => createCockpitSocket(), []);
  const [state, setState] = useState(INITIAL);
  const [recordingsVersion, setRecordingsVersion] = useState(0);
  const mailListeners = useRef(new Set());

  useEffect(() => {
    const onState = (s) =>
      setState((prev) => ({ ...prev, ...s, offset: s.serverNow - Date.now(), connected: true }));
    const onViewers = ({ viewers, stats }) => setState((prev) => ({ ...prev, viewers, stats }));
    const onHearts = ({ hearts }) => setState((prev) => ({ ...prev, stats: { ...prev.stats, hearts } }));
    const onRecordings = () => setRecordingsVersion((v) => v + 1);
    const onMail = (type) => (data) => mailListeners.current.forEach((fn) => fn(type, data));
    const onMailProgress = onMail("progress");
    const onMailDone = onMail("done");
    const onDisconnect = () => setState((prev) => ({ ...prev, connected: false }));
    const onConnectError = (err) => {
      if (err.message === "unauthorized") window.location.replace("/cockpit/login?next=/cockpit");
    };

    socket.on("cockpit:state", onState);
    socket.on("viewers:update", onViewers);
    socket.on("hearts:update", onHearts);
    socket.on("recordings:changed", onRecordings);
    socket.on("mail:progress", onMailProgress);
    socket.on("mail:done", onMailDone);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    return () => {
      socket.off("cockpit:state", onState);
      socket.off("viewers:update", onViewers);
      socket.off("hearts:update", onHearts);
      socket.off("recordings:changed", onRecordings);
      socket.off("mail:progress", onMailProgress);
      socket.off("mail:done", onMailDone);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, [socket]);

  // Connexion à l'affichage du cockpit, déconnexion à la fermeture.
  useEffect(() => {
    socket.connect();
    return () => socket.disconnect();
  }, [socket]);

  const broadcaster = useBroadcaster(socket, state.iceServers);

  // Live terminé ailleurs alors que cet onglet diffusait encore.
  const { releaseAfterRemoteEnd, status: broadcastStatus } = broadcaster;
  useEffect(() => {
    if (state.connected && !state.live && broadcastStatus === "live") releaseAfterRemoteEnd();
  }, [state.connected, state.live, broadcastStatus, releaseAfterRemoteEnd]);

  const value = useMemo(
    () => ({
      socket,
      ...state,
      // Cet onglet est-il celui qui diffuse ?
      isBroadcasting: Boolean(state.broadcasterSocketId) && state.broadcasterSocketId === socket.id,
      broadcaster,
      recordingsVersion,
      /** Abonnement aux événements d'envoi d'emails ; retourne la fonction de désabonnement. */
      onMail(listener) {
        mailListeners.current.add(listener);
        return () => mailListeners.current.delete(listener);
      },
    }),
    [socket, state, broadcaster, recordingsVersion]
  );

  return <CockpitContext.Provider value={value}>{children}</CockpitContext.Provider>;
}

export function useCockpit() {
  return useContext(CockpitContext);
}
