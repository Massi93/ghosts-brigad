/**
 * Diffusion du live depuis le cockpit : caméra/micro, WebRTC vers chaque viewer
 * et enregistrement automatique.
 *
 * Architecture « mesh » : une RTCPeerConnection par viewer, ouverte par Dani.
 * Le serveur relaie uniquement la signalisation (Socket.io).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { emitWithAck } from "../lib/socket";
import { ChunkedRecorder } from "./recorder";

// Débit vidéo max envoyé à chaque viewer (limite la bande passante montante de Dani).
const MAX_VIDEO_BITRATE = 1_500_000;

const VIDEO_CONSTRAINTS = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };
const AUDIO_CONSTRAINTS = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

function randomId() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

/** Message d'erreur lisible pour getUserMedia. */
function mediaErrorMessage(err) {
  switch (err?.name) {
    case "NotAllowedError":
      return "Permiso denegado: autoriza la cámara y el micrófono en el navegador.";
    case "NotFoundError":
      return "No se encontró ninguna cámara o micrófono.";
    case "NotReadableError":
      return "La cámara o el micrófono ya están en uso por otra aplicación.";
    default:
      return window.isSecureContext
        ? err?.message || "No se pudo acceder a la cámara."
        : "La cámara solo funciona en https:// o en http://localhost.";
  }
}

/**
 * @param {import("socket.io-client").Socket} socket  socket `/cockpit`
 * @param {RTCIceServer[]} iceServers
 */
export function useBroadcaster(socket, iceServers) {
  const [stream, setStream] = useState(null);
  // idle | preview | starting | live | stopping
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [devices, setDevices] = useState({ cameras: [], mics: [] });
  const [selected, setSelected] = useState({ cameraId: "", micId: "" });
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [recording, setRecording] = useState({ status: "idle", bytes: 0, id: null });
  const [peerStates, setPeerStates] = useState({}); // viewerId -> connectionState
  const [revoked, setRevoked] = useState(false);

  const streamRef = useRef(null);
  const statusRef = useRef("idle");
  const liveIdRef = useRef(null);
  const peers = useRef(new Map()); // viewerId -> { pc, sid, pending: [] }
  const recorderRef = useRef(null);
  const pendingViewers = useRef(new Set()); // viewers arrivés pendant le démarrage
  const iceRef = useRef(iceServers);
  iceRef.current = iceServers;

  const setStatusBoth = (value) => {
    statusRef.current = value;
    setStatus(value);
  };

  /* ------------------------------ Caméra ------------------------------ */

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const list = await navigator.mediaDevices.enumerateDevices();
    setDevices({
      cameras: list.filter((d) => d.kind === "videoinput"),
      mics: list.filter((d) => d.kind === "audioinput"),
    });
  }, []);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  };

  /** Ouvre (ou rouvre) la caméra et le micro choisis. */
  const startPreview = useCallback(
    async (choice = selected) => {
      setError("");
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(mediaErrorMessage());
        return null;
      }
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: choice.cameraId ? { ...VIDEO_CONSTRAINTS, deviceId: { exact: choice.cameraId } } : VIDEO_CONSTRAINTS,
          audio: choice.micId ? { ...AUDIO_CONSTRAINTS, deviceId: { exact: choice.micId } } : AUDIO_CONSTRAINTS,
        });
        stopTracks();
        streamRef.current = media;
        setStream(media);
        setMicOn(true);
        setCamOn(true);
        if (statusRef.current === "idle") setStatusBoth("preview");
        await refreshDevices();
        return media;
      } catch (err) {
        setError(mediaErrorMessage(err));
        return null;
      }
    },
    [selected, refreshDevices]
  );

  const stopPreview = useCallback(() => {
    if (statusRef.current !== "preview") return;
    stopTracks();
    setStatusBoth("idle");
  }, []);

  /** Change de caméra / micro (uniquement hors direct). */
  const selectDevice = useCallback(
    async (patch) => {
      const next = { ...selected, ...patch };
      setSelected(next);
      if (streamRef.current && statusRef.current === "preview") await startPreview(next);
    },
    [selected, startPreview]
  );

  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  };

  const toggleCam = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  };

  /* ------------------------------ WebRTC ------------------------------ */

  const updatePeerState = (viewerId, state) =>
    setPeerStates((prev) => {
      if (state === null) {
        const { [viewerId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [viewerId]: state };
    });

  const closePeer = useCallback((viewerId) => {
    const peer = peers.current.get(viewerId);
    if (!peer) return;
    peer.pc.close();
    peers.current.delete(viewerId);
    updatePeerState(viewerId, null);
  }, []);

  const closeAllPeers = useCallback(() => {
    for (const viewerId of [...peers.current.keys()]) closePeer(viewerId);
  }, [closePeer]);

  /** Ouvre une connexion vers un viewer et lui envoie une offre. */
  const connectViewer = useCallback(
    async (viewerId) => {
      const media = streamRef.current;
      if (statusRef.current === "starting") {
        pendingViewers.current.add(viewerId);
        return;
      }
      if (!media || statusRef.current !== "live") return;
      closePeer(viewerId);

      const sid = randomId();
      const pc = new RTCPeerConnection({ iceServers: iceRef.current });
      const peer = { pc, sid, pending: [] };
      peers.current.set(viewerId, peer);
      updatePeerState(viewerId, "new");

      media.getTracks().forEach((track) => pc.addTrack(track, media));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("rtc:signal", { to: viewerId, sid, candidate: event.candidate.toJSON() });
        }
      };
      pc.onconnectionstatechange = () => {
        if (peers.current.get(viewerId) !== peer) return;
        updatePeerState(viewerId, pc.connectionState);
        // En cas d'échec, le viewer redemandera une offre (viewer:retry).
        if (pc.connectionState === "failed") closePeer(viewerId);
      };

      try {
        await pc.setLocalDescription(await pc.createOffer());
        // Plafonne le débit vidéo de cette connexion.
        for (const sender of pc.getSenders()) {
          if (sender.track?.kind !== "video") continue;
          const params = sender.getParameters();
          if (!params.encodings?.length) params.encodings = [{}];
          params.encodings[0].maxBitrate = MAX_VIDEO_BITRATE;
          await sender.setParameters(params).catch(() => {});
        }
        socket.emit("rtc:signal", { to: viewerId, sid, description: pc.localDescription.toJSON() });
      } catch (err) {
        console.warn("[cockpit] Offre WebRTC impossible :", err);
        closePeer(viewerId);
      }
    },
    [socket, closePeer]
  );

  // Messages venant du serveur (viewers et réponses WebRTC).
  useEffect(() => {
    const onViewerNew = ({ viewerId }) => connectViewer(viewerId);
    const onViewerLeft = ({ viewerId }) => closePeer(viewerId);
    const onSignal = async ({ from, sid, description, candidate }) => {
      const peer = peers.current.get(from);
      if (!peer || peer.sid !== sid) return;
      try {
        if (description?.type === "answer") {
          await peer.pc.setRemoteDescription(description);
          for (const c of peer.pending.splice(0)) await peer.pc.addIceCandidate(c).catch(() => {});
        } else if (candidate) {
          if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(candidate).catch(() => {});
          else peer.pending.push(candidate);
        }
      } catch (err) {
        console.warn("[cockpit] Signal WebRTC ignoré :", err);
      }
    };
    // Un autre onglet a pris la main : on arrête d'envoyer la vidéo ici (le live continue).
    const onRevoked = () => {
      closeAllPeers();
      recorderRef.current?.stop();
      recorderRef.current = null;
      stopTracks();
      setStatusBoth("idle");
      setRevoked(true);
    };
    // Reconnexion du socket pendant le direct : on se rattache au live.
    const onReconnect = async () => {
      if (statusRef.current !== "live") return;
      try {
        const res = await emitWithAck(socket, "broadcast:start", { takeover: true });
        for (const viewerId of res.viewerIds) {
          const state = peers.current.get(viewerId)?.pc.connectionState;
          if (state !== "connected" && state !== "connecting") connectViewer(viewerId);
        }
      } catch (err) {
        setError(err.message);
      }
    };

    socket.on("viewer:new", onViewerNew);
    socket.on("viewer:left", onViewerLeft);
    socket.on("rtc:signal", onSignal);
    socket.on("broadcast:revoked", onRevoked);
    socket.io.on("reconnect", onReconnect);
    return () => {
      socket.off("viewer:new", onViewerNew);
      socket.off("viewer:left", onViewerLeft);
      socket.off("rtc:signal", onSignal);
      socket.off("broadcast:revoked", onRevoked);
      socket.io.off("reconnect", onReconnect);
    };
  }, [socket, connectViewer, closePeer, closeAllPeers]);

  /* --------------------------- Début / fin du live --------------------------- */

  /**
   * Passe en direct.
   * @param {{ liveId?: number, title?: string, takeover?: boolean }} options
   *   liveId : live programmé à démarrer ; title : live immédiat ; sans les deux : reprise.
   */
  const goLive = useCallback(
    async (options = {}) => {
      setError("");
      setRevoked(false);
      const media = streamRef.current ?? (await startPreview());
      if (!media) return false;

      setStatusBoth("starting");
      try {
        const res = await emitWithAck(socket, "broadcast:start", options);
        liveIdRef.current = res.live.id;
        setStatusBoth("live");
        const viewerIds = new Set([...res.viewerIds, ...pendingViewers.current]);
        pendingViewers.current.clear();
        viewerIds.forEach((viewerId) => connectViewer(viewerId));

        // Enregistrement automatique (un échec n'empêche pas le direct).
        const recorder = new ChunkedRecorder(media, res.live.id, setRecording);
        recorderRef.current = recorder;
        recorder.start().catch((err) => setRecording({ status: "error", bytes: 0, id: null, error: err.message }));
        return true;
      } catch (err) {
        pendingViewers.current.clear();
        setError(err.message);
        setStatusBoth("preview");
        return false;
      }
    },
    [socket, startPreview, connectViewer]
  );

  /**
   * Le live a été terminé ailleurs (autre onglet, délai de grâce…) :
   * on libère la caméra et on finalise l'enregistrement local.
   */
  const releaseAfterRemoteEnd = useCallback(async () => {
    if (statusRef.current !== "live") return;
    setStatusBoth("stopping");
    closeAllPeers();
    try {
      await recorderRef.current?.stop();
    } finally {
      recorderRef.current = null;
    }
    stopTracks();
    liveIdRef.current = null;
    setStatusBoth("idle");
  }, [closeAllPeers]);

  /** Termine le live : sauvegarde de l'enregistrement puis fermeture. */
  const endLive = useCallback(async () => {
    if (statusRef.current !== "live") return;
    setStatusBoth("stopping");
    try {
      await recorderRef.current?.stop();
    } finally {
      recorderRef.current = null;
    }
    try {
      await emitWithAck(socket, "broadcast:stop", {});
    } catch (err) {
      setError(err.message);
    }
    closeAllPeers();
    stopTracks();
    liveIdRef.current = null;
    setStatusBoth("idle");
  }, [socket, closeAllPeers]);

  // Avertit avant de fermer l'onglet pendant le direct.
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (statusRef.current === "live" || statusRef.current === "stopping") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Nettoyage à la fermeture du cockpit.
  useEffect(
    () => () => {
      closeAllPeers();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [closeAllPeers]
  );

  return {
    stream,
    status,
    error,
    devices,
    selected,
    micOn,
    camOn,
    recording,
    peerStates,
    revoked,
    startPreview,
    stopPreview,
    selectDevice,
    toggleMic,
    toggleCam,
    goLive,
    endLive,
    releaseAfterRemoteEnd,
  };
}
