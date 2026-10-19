/**
 * Connexions Socket.io (temps réel).
 *  - `/live`    : public, partagé par le bouton LIVE, la rubrique « Próximo live » et la page /live
 *  - `/cockpit` : réservé au cockpit (authentifié par le cookie de session)
 */
import { io } from "socket.io-client";

let publicSocket = null;

/** Socket public unique pour toute la page. */
export function getPublicSocket() {
  if (!publicSocket) {
    publicSocket = io("/live", { transports: ["websocket", "polling"] });
  }
  return publicSocket;
}

/** Nouveau socket pour le cockpit (connecté explicitement par le composant qui l'utilise). */
export function createCockpitSocket() {
  return io("/cockpit", { transports: ["websocket", "polling"], withCredentials: true, autoConnect: false });
}

/** `socket.emit` avec acquittement sous forme de promesse (délai max 10 s). */
export function emitWithAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(10_000).emit(event, payload, (err, response) => {
      if (err) return reject(new Error("El servidor no responde"));
      if (response?.error) {
        const error = new Error(response.error);
        error.code = response.code; // ex. "ended", "busy"
        return reject(error);
      }
      resolve(response);
    });
  });
}
