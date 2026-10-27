/**
 * Réception du flux vidéo de Dani côté viewer (WebRTC, réception seule).
 *
 * Le viewer ne demande jamais l'accès à sa caméra ni à son micro : il répond
 * simplement aux offres envoyées par le navigateur de Dani (relayées par WebSocket).
 */
import { useEffect, useRef, useState } from "react";

/**
 * @param {import("../lib/socket.js").LiveSocket} socket  socket public
 * @param {boolean} enabled  rejoindre la salle des viewers (un live existe)
 * @returns {{ stream: MediaStream|null, state: string }}
 *   state : "idle" | "waiting" | "connecting" | "connected" | "full"
 */
export function useViewerStream(socket, enabled) {
  const [stream, setStream] = useState(null);
  const [state, setState] = useState("idle");
  const pcRef = useRef(null);
  const sidRef = useRef(null);
  const pendingCandidates = useRef([]);
  const iceServers = useRef([]);

  useEffect(() => {
    if (!enabled) return undefined;
    let disposed = false;
    let retryTimer = null;

    const closePeer = () => {
      pcRef.current?.close();
      pcRef.current = null;
      sidRef.current = null;
      pendingCandidates.current = [];
    };

    let joined = false;

    // Rejoint la salle des viewers (et à chaque reconnexion du socket).
    // Refus temporaire (salle d'attente pas encore ouverte, live complet) : on réessaie.
    const join = () => {
      clearTimeout(retryTimer);
      socket.timeout(8000).emit("viewer:join", {}, (err, res) => {
        if (disposed) return;
        if (err || !res) {
          retryTimer = setTimeout(join, 3000);
          return;
        }
        if (!res.ok) {
          setState(res.reason === "full" || res.reason === "ip_limit" ? "full" : "idle");
          retryTimer = setTimeout(join, res.reason === "too_early" ? 60_000 : 15_000);
          return;
        }
        joined = true;
        iceServers.current = res.iceServers || [];
        setState((s) => (s === "connected" ? s : "waiting"));
      });
    };

    const createPeer = (sid) => {
      const pc = new RTCPeerConnection({ iceServers: iceServers.current });
      pcRef.current = pc;
      sidRef.current = sid;

      pc.ontrack = (event) => {
        setStream(event.streams[0] ?? new MediaStream([event.track]));
      };
      pc.onicecandidate = (event) => {
        if (event.candidate) socket.emit("rtc:signal", { sid, candidate: event.candidate.toJSON() });
      };
      pc.onconnectionstatechange = () => {
        if (pcRef.current !== pc) return;
        if (pc.connectionState === "connected") setState("connected");
        if (pc.connectionState === "failed") {
          // Échec réseau : on repart de zéro et on redemande une offre.
          closePeer();
          setStream(null);
          setState("connecting");
          retryTimer = setTimeout(() => socket.emit("viewer:retry"), 1500);
        }
      };
      return pc;
    };

    // Messages de négociation venant de Dani.
    const onSignal = async ({ sid, description, candidate }) => {
      try {
        if (description?.type === "offer") {
          if (sid !== sidRef.current) {
            closePeer();
            createPeer(sid);
          }
          const pc = pcRef.current;
          setState((s) => (s === "connected" ? s : "connecting"));
          await pc.setRemoteDescription(description);
          for (const c of pendingCandidates.current.splice(0)) {
            await pc.addIceCandidate(c).catch(() => {});
          }
          await pc.setLocalDescription(await pc.createAnswer());
          socket.emit("rtc:signal", { sid, description: pc.localDescription.toJSON() });
        } else if (candidate && sid === sidRef.current) {
          const pc = pcRef.current;
          if (pc?.remoteDescription) await pc.addIceCandidate(candidate).catch(() => {});
          else pendingCandidates.current.push(candidate);
        }
      } catch (err) {
        console.warn("[live] Erreur WebRTC :", err);
      }
    };

    // Le live démarre alors qu'on n'est pas encore dans la salle : on entre tout de suite.
    const onStatus = (payload) => {
      if (!joined && payload.live?.status === "live") join();
      // Plus de live : le message « live complet » n'a plus lieu d'être.
      else if (!joined) setState((s) => (s === "full" ? "idle" : s));
    };
    const onConnect = () => {
      joined = false;
      join();
    };

    socket.on("rtc:signal", onSignal);
    socket.on("live:status", onStatus);
    socket.on("connect", onConnect);
    if (socket.connected) join();

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      socket.off("rtc:signal", onSignal);
      socket.off("live:status", onStatus);
      socket.off("connect", onConnect);
      socket.emit("viewer:leave");
      closePeer();
      setStream(null);
      setState("idle");
    };
  }, [socket, enabled]);

  return { stream, state };
}
