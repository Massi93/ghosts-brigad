/**
 * Remplace src/live/useViewerStream.js dans la démo : la page /live reçoit
 * directement le flux de la caméra du cockpit (même page), sans WebRTC.
 */
import { useEffect, useState } from "react";
import { joinAsSelf, leaveAsSelf, subscribe, viewerStream } from "./demoServer.js";

export function useViewerStream(socket, enabled) {
  const [stream, setStream] = useState(null);
  const [state, setState] = useState("idle");

  useEffect(() => {
    if (!enabled) return undefined;
    const viewerId = socket.id;
    joinAsSelf(viewerId);
    const update = () => {
      const s = viewerStream();
      setStream((prev) => (prev === s ? prev : s));
      setState(s ? "connected" : "waiting");
    };
    update();
    const unsubscribe = subscribe(update);
    return () => {
      unsubscribe();
      leaveAsSelf(viewerId);
      setStream(null);
      setState("idle");
    };
  }, [socket, enabled]);

  return { stream, state };
}
