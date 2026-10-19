import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Clock,
  Eye,
  Heart,
  Mic,
  MicOff,
  Radio,
  Square,
  TrendingUp,
  UserRound,
  Users,
  Video,
} from "lucide-react";
import { api } from "../../lib/api";
import { formatBytes, formatDuration, formatLiveDate, useNow } from "../../lib/time";
import { useCockpit } from "../CockpitContext";
import { Badge, Button, Card, EmptyState, Field, SectionTitle, Stat, flag, inputClass, useToast } from "../ui";

/** Live pré-sélectionné via l'URL (#directo?live=12, depuis « Programación »). */
function preselectedLiveId() {
  const query = window.location.hash.split("?")[1];
  const id = Number(new URLSearchParams(query).get("live"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

const PEER_LABELS = {
  connected: { tone: "success", label: "Viendo" },
  new: { tone: "warning", label: "Conectando" },
  connecting: { tone: "warning", label: "Conectando" },
  disconnected: { tone: "warning", label: "Inestable" },
  failed: { tone: "danger", label: "Error" },
};

export default function LiveStudio() {
  const { live, stats, viewers, offset, broadcasterSocketId, interruptedSince, graceSeconds, isBroadcasting, broadcaster } =
    useCockpit();
  const toast = useToast();
  const now = useNow(1000, { offset });
  const videoRef = useRef(null);

  const [upcoming, setUpcoming] = useState([]);
  const [mode, setMode] = useState("scheduled"); // scheduled | instant
  const [liveId, setLiveId] = useState(preselectedLiveId());
  const [title, setTitle] = useState("");
  const [ending, setEnding] = useState(false);

  const b = broadcaster;
  const localLive = b.status === "live" || b.status === "stopping";
  const busy = b.status === "starting" || b.status === "stopping";

  // Lives programmés disponibles pour le démarrage.
  useEffect(() => {
    if (live) return;
    api("/admin/lives")
      .then(({ upcoming: list }) => {
        setUpcoming(list);
        if (!list.length) setMode("instant");
        setLiveId((current) => (list.some((l) => l.id === current) ? current : list[0]?.id ?? null));
      })
      .catch(() => {});
  }, [live]);

  // Aperçu caméra.
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = b.stream;
  }, [b.stream]);

  const start = async () => {
    const options = mode === "scheduled" && liveId ? { liveId } : { title: title || "Live con Dani" };
    const ok = await b.goLive(options);
    if (ok) toast("¡Estás en directo! 🔴");
  };

  const resume = async (takeover = false) => {
    const ok = await b.goLive({ liveId: live.id, resume: true, takeover });
    if (ok) toast("Transmisión reanudada");
  };

  const stop = async () => {
    if (!window.confirm("¿Terminar el live para todos los espectadores?")) return;
    if (localLive) {
      await b.endLive();
    } else {
      setEnding(true);
      await api("/admin/live/end", { method: "POST" }).catch((err) => toast(err.message, "error"));
      setEnding(false);
    }
    toast("Live terminado. La grabación está en « Grabaciones ».");
  };

  const startedAt = live?.startedAt ? Date.parse(live.startedAt) : null;
  const duration = startedAt ? now - startedAt : 0;
  const graceLeft = interruptedSince ? graceSeconds * 1000 - (now - interruptedSince) : 0;

  const sortedViewers = useMemo(
    () => [...viewers].sort((a, b2) => Date.parse(a.joinedAt) - Date.parse(b2.joinedAt)),
    [viewers]
  );

  return (
    <div>
      <SectionTitle title="Directo" subtitle="Cámara, transmisión y espectadores en tiempo real." />

      {/* Bandeaux d'état */}
      <div className="mb-5 flex flex-col gap-3">
        {b.error && <Banner tone="danger" text={b.error} />}
        {b.revoked && <Banner tone="warning" text="Otra pestaña tomó el control de la transmisión." />}
        {live && !localLive && b.status !== "starting" && (!broadcasterSocketId || isBroadcasting) && (
          <Banner
            tone="warning"
            text={
              interruptedSince
                ? `El live sigue abierto pero la cámara se desconectó. Se cerrará solo en ${formatDuration(Math.max(graceLeft, 0))} si no la reanudas.`
                : "El live sigue abierto pero esta pestaña no está transmitiendo."
            }
            actions={
              <>
                <Button variant="danger" icon={Video} loading={b.status === "starting"} onClick={() => resume(false)}>
                  Reanudar cámara
                </Button>
                <Button variant="ghost" icon={Square} loading={ending} onClick={stop}>
                  Terminar live
                </Button>
              </>
            }
          />
        )}
        {live && broadcasterSocketId && !isBroadcasting && !localLive && (
          <Banner
            tone="info"
            text="Se está transmitiendo desde otra pestaña o dispositivo."
            actions={
              <Button variant="ghost" icon={Video} onClick={() => resume(true)}>
                Transmitir desde aquí
              </Button>
            }
          />
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Vidéo */}
        <div className="lg:col-span-2">
          <div className="relative aspect-video overflow-hidden rounded-3xl border border-white/10 bg-black">
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className={`h-full w-full -scale-x-100 object-cover ${b.stream ? "" : "hidden"}`}
            />
            {!b.stream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <Camera className="h-10 w-10 text-white/30" />
                <p className="text-sm text-white/50">La cámara está apagada</p>
                <Button variant="ghost" icon={Camera} onClick={() => b.startPreview()}>
                  Activar cámara y micrófono
                </Button>
              </div>
            )}
            <div className="absolute left-3 top-3 flex items-center gap-2">
              {localLive ? (
                <Badge tone="live" className="px-3 py-1 text-xs">
                  <span className="live-blink">● LIVE</span>
                  <span className="font-mono">{formatDuration(duration)}</span>
                </Badge>
              ) : (
                b.stream && <Badge tone="overlay" className="px-3 py-1 text-xs">Vista previa</Badge>
              )}
            </div>
            {localLive && (
              <div className="absolute right-3 top-3">
                <RecordingBadge recording={b.recording} />
              </div>
            )}
            {b.stream && !b.camOn && (
              <div className="absolute inset-0 grid place-items-center bg-black/80 text-sm text-white/60">
                Cámara pausada (los espectadores ven una imagen negra)
              </div>
            )}
          </div>

          {/* Commandes caméra / micro */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant={b.micOn ? "ghost" : "danger"}
              icon={b.micOn ? Mic : MicOff}
              onClick={b.toggleMic}
              disabled={!b.stream}
            >
              {b.micOn ? "Micro activo" : "Micro silenciado"}
            </Button>
            <Button
              variant={b.camOn ? "ghost" : "danger"}
              icon={b.camOn ? Camera : CameraOff}
              onClick={b.toggleCam}
              disabled={!b.stream}
            >
              {b.camOn ? "Cámara activa" : "Cámara pausada"}
            </Button>
            <select
              className={`${inputClass} w-auto max-w-[14rem] py-2`}
              value={b.selected.cameraId}
              onChange={(e) => b.selectDevice({ cameraId: e.target.value })}
              disabled={localLive || !b.devices.cameras.length}
              aria-label="Cámara"
            >
              <option value="">Cámara predeterminada</option>
              {b.devices.cameras.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Cámara ${i + 1}`}
                </option>
              ))}
            </select>
            <select
              className={`${inputClass} w-auto max-w-[14rem] py-2`}
              value={b.selected.micId}
              onChange={(e) => b.selectDevice({ micId: e.target.value })}
              disabled={localLive || !b.devices.mics.length}
              aria-label="Micrófono"
            >
              <option value="">Micrófono predeterminado</option>
              {b.devices.mics.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Micrófono ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Panneau de contrôle */}
        <Card className="flex flex-col gap-4">
          {localLive ? (
            <>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/50">En directo</p>
                <p className="mt-1 font-display text-xl font-bold">{live?.title}</p>
              </div>
              <Button variant="danger" icon={Square} loading={b.status === "stopping"} onClick={stop} className="py-3">
                {b.status === "stopping" ? "Guardando grabación…" : "Terminar live"}
              </Button>
              <p className="text-xs text-white/40">
                La grabación se guarda automáticamente en el servidor cada 2 segundos.
              </p>
            </>
          ) : live ? (
            <p className="text-sm text-white/60">Hay un live abierto: usa los botones de arriba.</p>
          ) : (
            <>
              <p className="font-display text-lg font-bold">Iniciar un live</p>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1 text-xs font-semibold">
                {[
                  ["scheduled", "Programado"],
                  ["instant", "Inmediato"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    disabled={value === "scheduled" && !upcoming.length}
                    className={`rounded-lg px-3 py-2 transition disabled:opacity-40 ${
                      mode === value ? "bg-brand-500 text-white" : "text-white/60"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === "scheduled" ? (
                <Field label="Live programado">
                  <select className={inputClass} value={liveId ?? ""} onChange={(e) => setLiveId(Number(e.target.value))}>
                    {upcoming.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title} — {formatLiveDate(l.scheduledAt)}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field label="Título del live">
                  <input
                    className={inputClass}
                    value={title}
                    maxLength={120}
                    placeholder="Live con Dani"
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </Field>
              )}

              <Button variant="danger" icon={Radio} loading={busy} onClick={start} className="py-3">
                Iniciar live
              </Button>
              <p className="text-xs text-white/40">
                Se pedirá acceso a la cámara y al micrófono. El live se graba automáticamente.
              </p>
            </>
          )}
        </Card>
      </div>

      {/* Statistiques en temps réel */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat icon={Eye} label="Espectadores" value={stats.viewers} tone="text-emerald-300" />
        <Stat icon={TrendingUp} label="Pico" value={stats.peakViewers} />
        <Stat icon={Heart} label="Me gusta" value={stats.hearts} tone="text-pink-400" />
        <Stat icon={Clock} label="Duración" value={live ? formatDuration(duration) : "—"} />
        <Stat icon={Users} label="Conexiones" value={stats.totalViewers} hint="Total desde el inicio" />
      </div>

      {/* Liste des viewers */}
      <Card className="mt-6 p-0">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <p className="font-display font-bold">Espectadores conectados</p>
          <Badge tone="info">{viewers.length}</Badge>
        </div>
        {sortedViewers.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title="Nadie conectado por ahora"
            text="Los espectadores aparecen aquí en cuanto abren la página del live (también en la sala de espera)."
          />
        ) : (
          <ul className="divide-y divide-white/5">
            {sortedViewers.map((v) => {
              const peer = PEER_LABELS[b.peerStates[v.id]];
              return (
                <li key={v.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                  <span className="text-xl" aria-hidden="true">
                    {flag(v.countryCode)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{v.location}</p>
                    <p className="text-xs text-white/40">
                      {v.device} · {v.browser} · IP {v.maskedIp}
                    </p>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-white/50">
                    {formatDuration(now - Date.parse(v.joinedAt))}
                  </span>
                  {peer ? (
                    <Badge tone={peer.tone}>{peer.label}</Badge>
                  ) : (
                    <Badge>{live ? "Sin vídeo" : "En espera"}</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Banner({ tone, text, actions }) {
  const tones = {
    danger: "border-red-500/30 bg-red-500/10 text-red-100",
    warning: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    info: "border-brand-400/30 bg-brand-400/10 text-brand-100",
  };
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${tones[tone]}`}>
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1">{text}</p>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function RecordingBadge({ recording }) {
  if (recording.status === "error") {
    return <Badge tone="overlay" className="px-3 py-1 text-xs text-red-300">Grabación con error</Badge>;
  }
  if (recording.status === "retrying") {
    return <Badge tone="overlay" className="px-3 py-1 text-xs text-amber-300">REC · reconectando…</Badge>;
  }
  if (recording.status === "saving") {
    return <Badge tone="overlay" className="px-3 py-1 text-xs">Guardando…</Badge>;
  }
  return (
    <Badge tone="overlay" className="px-3 py-1 text-xs">
      <span className="text-red-500">●</span> REC {formatBytes(recording.bytes)}
    </Badge>
  );
}
