/**
 * Enregistrement automatique du live dans le navigateur de Dani.
 *
 * MediaRecorder produit un morceau toutes les 2 secondes ; chaque morceau est
 * envoyé immédiatement au serveur (dans l'ordre), qui l'ajoute au fichier.
 * À l'arrêt, le serveur finalise le fichier (durée écrite dans l'en-tête WebM).
 */
import { api, ApiError } from "../lib/api";

const TIMESLICE_MS = 2000;
const MAX_RETRIES = 4;

// Par ordre de préférence : VP8 est le moins gourmand en CPU (la caméra
// est déjà encodée une fois par viewer), MP4 pour Safari.
const MIME_CANDIDATES = [
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9,opus",
  "video/webm",
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/mp4",
];

export function pickRecordingMime() {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class ChunkedRecorder {
  /**
   * @param {MediaStream} stream
   * @param {number} liveId
   * @param {(info: { status: string, bytes: number, id: number|null, error?: string }) => void} onUpdate
   */
  constructor(stream, liveId, onUpdate = () => {}) {
    this.stream = stream;
    this.liveId = liveId;
    this.onUpdate = onUpdate;
    this.id = null;
    this.seq = 0;
    this.bytes = 0;
    this.queue = Promise.resolve();
    this.failed = false;
    this.status = "idle";
  }

  emit(extra = {}) {
    this.onUpdate({ status: this.status, bytes: this.bytes, id: this.id, ...extra });
  }

  /** Crée le fichier côté serveur et démarre l'enregistrement. */
  async start() {
    const mimeType = pickRecordingMime();
    if (!mimeType) throw new Error("Este navegador no permite grabar el live");

    const { id } = await api("/admin/recordings", {
      method: "POST",
      body: { liveId: this.liveId, mimeType },
    });
    this.id = id;

    this.recorder = new MediaRecorder(this.stream, {
      mimeType,
      videoBitsPerSecond: 2_500_000,
      audioBitsPerSecond: 128_000,
    });
    this.recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) this.enqueue(event.data);
    };
    this.recorder.onerror = (event) => {
      this.status = "error";
      this.emit({ error: event.error?.message || "Error de grabación" });
    };
    this.startedAt = performance.now();
    this.recorder.start(TIMESLICE_MS);
    this.status = "recording";
    this.emit();
  }

  /** Ajoute un morceau à la file d'envoi (les envois sont strictement séquentiels). */
  enqueue(blob) {
    const seq = this.seq++;
    this.queue = this.queue.then(() => this.upload(seq, blob));
  }

  async upload(seq, blob) {
    if (this.failed) return;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const res = await api(`/admin/recordings/${this.id}/chunks?seq=${seq}`, {
          method: "POST",
          body: blob,
        });
        this.bytes = res.bytes;
        this.emit();
        return;
      } catch (err) {
        // Fichier fermé côté serveur : inutile de réessayer.
        if (err instanceof ApiError && (err.status === 404 || err.status === 409)) {
          this.failed = true;
          this.status = "error";
          this.emit({ error: err.message });
          return;
        }
        if (attempt === MAX_RETRIES) {
          this.failed = true;
          this.status = "error";
          this.emit({ error: "No se pudo subir la grabación" });
          return;
        }
        await sleep(500 * 2 ** attempt);
      }
    }
  }

  /** Arrête l'enregistrement, attend la fin des envois et finalise le fichier. */
  async stop() {
    if (!this.recorder || this.status === "stopped") return;
    const durationMs = Math.round(performance.now() - this.startedAt);
    if (this.recorder.state !== "inactive") {
      const stopped = new Promise((resolve) => {
        this.recorder.addEventListener("stop", resolve, { once: true });
      });
      this.recorder.stop();
      await stopped;
    }
    this.status = "saving";
    this.emit();
    await this.queue;
    try {
      await api(`/admin/recordings/${this.id}/finish`, { method: "POST", body: { durationMs } });
      this.status = "stopped";
      this.emit();
    } catch (err) {
      this.status = "error";
      this.emit({ error: err.message });
    }
  }
}
