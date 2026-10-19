/**
 * Caméra simulée de la démo : une animation dessinée sur un canvas, utilisée
 * quand le navigateur refuse la vraie webcam (c'est le cas dans l'aperçu Claude).
 * La piste audio est silencieuse.
 */
import { media } from "./demoServer.js";

// 960×540 à 24 images/s : assez net pour la démo, léger pour un téléphone
// (chaque image est aussi encodée par l'enregistreur).
const W = 960;
const H = 540;
const FPS = 24;

/** Décor fixe (fond + halos), dessiné une seule fois. */
function drawBackdrop() {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0b1220");
  bg.addColorStop(1, "#16224a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  for (const [color, x, y, r] of [
    ["rgba(51,88,244,0.45)", 230, 170, 260],
    ["rgba(245,181,61,0.28)", 740, 360, 240],
  ]) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return canvas;
}

function drawFrame(ctx, backdrop, t) {
  // Léger mouvement de caméra sur le décor.
  const dx = Math.sin(t / 2600) * 14;
  const dy = Math.cos(t / 3100) * 8;
  ctx.drawImage(backdrop, dx - 16, dy - 10, W + 32, H + 20);

  // Avatar de Dani avec anneau qui « parle ».
  const cx = W / 2;
  const cy = H / 2 - 34;
  const pulse = 1 + Math.sin(t / 220) * 0.04 + Math.sin(t / 97) * 0.02;
  ctx.beginPath();
  ctx.arc(cx, cy, 96 * pulse, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,45,85,0.75)";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 82, 0, Math.PI * 2);
  ctx.fillStyle = "#3358f4";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 90px Sora, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("D", cx, cy + 5);

  // Barres de voix.
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 9; i += 1) {
    const h = 10 + Math.abs(Math.sin(t / 140 + i * 0.8)) * 34;
    ctx.fillRect(cx - 81 + i * 19.5, cy + 152 - h / 2, 9, h);
  }

  ctx.font = "700 34px Sora, system-ui, sans-serif";
  ctx.fillText("Dani Inmigración", cx, cy + 212);
  ctx.font = "500 19px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  const clock = new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  ctx.fillText(`Cámara simulada (demo) · ${clock}`, cx, cy + 250);
}

/** Flux vidéo animé + piste audio silencieuse. */
export function createFakeCameraStream() {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const backdrop = drawBackdrop();
  const start = performance.now();
  drawFrame(ctx, backdrop, 0);
  const timer = setInterval(() => drawFrame(ctx, backdrop, performance.now() - start), 1000 / FPS);

  const stream = canvas.captureStream(FPS);
  try {
    const audio = new (window.AudioContext || window.webkitAudioContext)();
    const destination = audio.createMediaStreamDestination();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    gain.gain.value = 0;
    oscillator.connect(gain).connect(destination);
    oscillator.start();
    destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
  } catch {
    // pas d'audio : l'enregistrement se fait en vidéo seule
  }
  // Quand le cockpit coupe la caméra, l'animation s'arrête aussi.
  stream.getVideoTracks()[0]?.addEventListener("ended", () => clearInterval(timer));
  const stop = MediaStreamTrack.prototype.stop;
  stream.getTracks().forEach((track) => {
    track.stop = function stopTrack() {
      clearInterval(timer);
      return stop.call(this);
    };
  });
  return stream;
}

/**
 * Remplace getUserMedia : la vraie webcam si le navigateur l'autorise,
 * sinon la caméra simulée. Le flux est mémorisé pour la page /live de la démo.
 */
export function installCameraFallback() {
  const devices = navigator.mediaDevices ?? {};
  const real = devices.getUserMedia?.bind(devices);
  const getUserMedia = async (constraints) => {
    let stream;
    try {
      if (!real) throw new Error("no camera API");
      stream = await real(constraints);
    } catch {
      stream = createFakeCameraStream();
    }
    media.stream = stream;
    return stream;
  };
  if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia = getUserMedia;
    if (!navigator.mediaDevices.enumerateDevices) navigator.mediaDevices.enumerateDevices = async () => [];
  } else {
    try {
      Object.defineProperty(navigator, "mediaDevices", {
        value: { getUserMedia, enumerateDevices: async () => [] },
        configurable: true,
      });
    } catch {
      // navigateur très ancien : le cockpit affichera son message d'erreur caméra
    }
  }
}
