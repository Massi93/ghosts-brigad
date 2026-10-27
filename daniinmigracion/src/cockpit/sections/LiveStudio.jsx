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
import { useLang } from "../i18n";
import { translateServerMessage } from "../../lib/serverMessages";

/** « Ville, Pays » dans la langue du cockpit (le serveur l'envoie en espagnol). */
function viewerLocation(v, locale) {
  if (!v.countryCode) return translateServerMessage(v.location);
  let country = v.countryCode;
  try {
    country = new Intl.DisplayNames([locale], { type: "region" }).of(v.countryCode) ?? v.countryCode;
  } catch {
    // code pays inconnu du navigateur
  }
  return [v.city, country].filter(Boolean).join(", ");
}

/** Live pré-sélectionné via l'URL (#directo?live=12, depuis « Programación »). */
function preselectedLiveId() {
  const query = window.location.hash.split("?")[1];
  const id = Number(new URLSearchParams(query).get("live"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function peerLabel(state, t) {
  return {
    connected: { tone: "success", label: t("Viendo", "Regarde") },
    new: { tone: "warning", label: t("Conectando", "Connexion") },
    connecting: { tone: "warning", label: t("Conectando", "Connexion") },
    disconnected: { tone: "warning", label: t("Inestable", "Instable") },
    failed: { tone: "danger", label: t("Error", "Erreur") },
  }[state];
}

export default function LiveStudio() {
  const { live, stats, viewers, offset, broadcasterSocketId, interruptedSince, graceSeconds, isBroadcasting, broadcaster } =
    useCockpit();
  const { t, locale } = useLang();
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
    const options = mode === "scheduled" && liveId ? { liveId } : { title: title || t("Live con Dani", "Live avec Dani") };
    const ok = await b.goLive(options);
    if (ok) toast(t("¡Estás en directo! 🔴", "Vous êtes en direct ! 🔴"));
  };

  const resume = async (takeover = false) => {
    const ok = await b.goLive({ liveId: live.id, resume: true, takeover });
    if (ok) toast(t("Transmisión reanudada", "Diffusion reprise"));
  };

  const stop = async () => {
    if (!window.confirm(t("¿Terminar el live para todos los espectadores?", "Terminer le live pour tous les spectateurs ?"))) return;
    if (localLive) {
      await b.endLive();
    } else {
      setEnding(true);
      await api("/admin/live/end", { method: "POST" }).catch((err) => toast(err.message, "error"));
      setEnding(false);
    }
    toast(t("Live terminado. La grabación está en « Grabaciones ».", "Live terminé. L'enregistrement est dans « Enregistrements »."));
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
      <SectionTitle
        title={t("Directo", "Direct")}
        subtitle={t("Cámara, transmisión y espectadores en tiempo real.", "Caméra, diffusion et spectateurs en temps réel.")}
      />

      {/* Bandeaux d'état */}
      <div className="mb-5 flex flex-col gap-3">
        {b.error && <Banner tone="danger" text={b.error} />}
        {b.revoked && (
          <Banner
            tone="warning"
            text={t("Otra pestaña tomó el control de la transmisión.", "Un autre onglet a pris le contrôle de la diffusion.")}
          />
        )}
        {live && !localLive && b.status !== "starting" && (!broadcasterSocketId || isBroadcasting) && (
          <Banner
            tone="warning"
            text={
              interruptedSince
                ? t(
                    `El live sigue abierto pero la cámara se desconectó. Se cerrará solo en ${formatDuration(Math.max(graceLeft, 0))} si no la reanudas.`,
                    `Le live est toujours ouvert mais la caméra s'est déconnectée. Il se fermera seul dans ${formatDuration(Math.max(graceLeft, 0))} si vous ne la relancez pas.`
                  )
                : t("El live sigue abierto pero esta pestaña no está transmitiendo.", "Le live est toujours ouvert mais cet onglet ne diffuse pas.")
            }
            actions={
              <>
                <Button variant="danger" icon={Video} loading={b.status === "starting"} onClick={() => resume(false)}>
                  {t("Reanudar cámara", "Relancer la caméra")}
                </Button>
                <Button variant="ghost" icon={Square} loading={ending} onClick={stop}>
                  {t("Terminar live", "Terminer le live")}
                </Button>
              </>
            }
          />
        )}
        {live && broadcasterSocketId && !isBroadcasting && !localLive && (
          <Banner
            tone="info"
            text={t("Se está transmitiendo desde otra pestaña o dispositivo.", "La diffusion se fait depuis un autre onglet ou appareil.")}
            actions={
              <Button variant="ghost" icon={Video} onClick={() => resume(true)}>
                {t("Transmitir desde aquí", "Diffuser d'ici")}
              </Button>
            }
          />
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3 [&>*]:min-w-0">
        {/* Vidéo */}
        <div className="lg:col-span-2">
          <div className="relative aspect-video overflow-hidden rounded-3xl border border-site-line bg-black">
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className={`h-full w-full -scale-x-100 object-cover ${b.stream ? "" : "hidden"}`}
            />
            {!b.stream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <Camera className="h-10 w-10 text-site-gray/70" />
                <p className="text-sm text-white/60">{t("La cámara está apagada", "La caméra est éteinte")}</p>
                <Button variant="ghost" icon={Camera} onClick={() => b.startPreview()}>
                  {t("Activar cámara y micrófono", "Activer caméra et micro")}
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
                b.stream && <Badge tone="overlay" className="px-3 py-1 text-xs">{t("Vista previa", "Aperçu")}</Badge>
              )}
            </div>
            {localLive && (
              <div className="absolute right-3 top-3">
                <RecordingBadge recording={b.recording} t={t} locale={locale} />
              </div>
            )}
            {b.stream && !b.camOn && (
              <div className="absolute inset-0 grid place-items-center bg-black/80 text-sm text-white/70">
                {t("Cámara pausada (los espectadores ven una imagen negra)", "Caméra en pause (les spectateurs voient une image noire)")}
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
              {b.micOn ? t("Micro activo", "Micro actif") : t("Micro silenciado", "Micro coupé")}
            </Button>
            <Button
              variant={b.camOn ? "ghost" : "danger"}
              icon={b.camOn ? Camera : CameraOff}
              onClick={b.toggleCam}
              disabled={!b.stream}
            >
              {b.camOn ? t("Cámara activa", "Caméra active") : t("Cámara pausada", "Caméra en pause")}
            </Button>
            <select
              className={`${inputClass} w-full py-2 sm:w-auto sm:max-w-[16rem]`}
              value={b.selected.cameraId}
              onChange={(e) => b.selectDevice({ cameraId: e.target.value })}
              disabled={localLive || !b.devices.cameras.length}
              aria-label={t("Cámara", "Caméra")}
            >
              <option value="">{t("Cámara predeterminada", "Caméra par défaut")}</option>
              {b.devices.cameras.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `${t("Cámara", "Caméra")} ${i + 1}`}
                </option>
              ))}
            </select>
            <select
              className={`${inputClass} w-full py-2 sm:w-auto sm:max-w-[16rem]`}
              value={b.selected.micId}
              onChange={(e) => b.selectDevice({ micId: e.target.value })}
              disabled={localLive || !b.devices.mics.length}
              aria-label={t("Micrófono", "Micro")}
            >
              <option value="">{t("Micrófono predeterminado", "Micro par défaut")}</option>
              {b.devices.mics.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `${t("Micrófono", "Micro")} ${i + 1}`}
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
                <p className="text-xs uppercase tracking-wider text-site-gray">{t("En directo", "En direct")}</p>
                <p className="mt-1 font-display text-xl font-bold">{live?.title}</p>
              </div>
              <Button variant="danger" icon={Square} loading={b.status === "stopping"} onClick={stop} className="py-3">
                {b.status === "stopping" ? t("Guardando grabación…", "Sauvegarde de l'enregistrement…") : t("Terminar live", "Terminer le live")}
              </Button>
              <p className="text-xs text-site-gray">
                {t(
                  "La grabación se guarda automáticamente en Cloudflare cada 2 segundos.",
                  "L'enregistrement est sauvegardé automatiquement chez Cloudflare toutes les 2 secondes."
                )}
              </p>
            </>
          ) : live ? (
            <p className="text-sm text-site-text">
              {t("Hay un live abierto: usa los botones de arriba.", "Un live est ouvert : utilisez les boutons ci-dessus.")}
            </p>
          ) : (
            <>
              <p className="font-display text-lg font-bold">{t("Iniciar un live", "Démarrer un live")}</p>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-site-bg p-1 text-xs font-semibold">
                {[
                  ["scheduled", t("Programado", "Programmé")],
                  ["instant", t("Inmediato", "Immédiat")],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    disabled={value === "scheduled" && !upcoming.length}
                    className={`rounded-lg px-3 py-2 transition disabled:opacity-40 ${
                      mode === value ? "bg-site-red text-white" : "text-site-text"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === "scheduled" ? (
                <Field label={t("Live programado", "Live programmé")}>
                  <select className={inputClass} value={liveId ?? ""} onChange={(e) => setLiveId(Number(e.target.value))}>
                    {upcoming.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title} — {formatLiveDate(l.scheduledAt, locale)}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field label={t("Título del live", "Titre du live")}>
                  <input
                    className={inputClass}
                    value={title}
                    maxLength={120}
                    placeholder={t("Live con Dani", "Live avec Dani")}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </Field>
              )}

              <Button variant="danger" icon={Radio} loading={busy} onClick={start} className="py-3">
                {t("Iniciar live", "Démarrer le live")}
              </Button>
              <p className="text-xs text-site-gray">
                {t(
                  "Se pedirá acceso a la cámara y al micrófono. El live se graba automáticamente.",
                  "L'accès à la caméra et au micro sera demandé. Le live est enregistré automatiquement."
                )}
              </p>
            </>
          )}
        </Card>
      </div>

      {/* Statistiques en temps réel */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5 [&>*]:min-w-0">
        <Stat icon={Eye} label={t("Espectadores", "Spectateurs")} value={stats.viewers} tone="text-emerald-600" />
        <Stat icon={TrendingUp} label={t("Pico", "Pic")} value={stats.peakViewers} />
        <Stat icon={Heart} label={t("Me gusta", "J'aime")} value={stats.hearts} tone="text-pink-400" />
        <Stat icon={Clock} label={t("Duración", "Durée")} value={live ? formatDuration(duration) : "—"} />
        <Stat
          icon={Users}
          label={t("Conexiones", "Connexions")}
          value={stats.totalViewers}
          hint={t("Total desde el inicio", "Total depuis le début")}
        />
      </div>

      {/* Liste des viewers */}
      <Card className="mt-6 p-0">
        <div className="flex items-center justify-between border-b border-site-line px-5 py-4">
          <p className="font-display font-bold">{t("Espectadores conectados", "Spectateurs connectés")}</p>
          <Badge tone="info">{viewers.length}</Badge>
        </div>
        {sortedViewers.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title={t("Nadie conectado por ahora", "Personne n'est connecté pour l'instant")}
            text={t(
              "Los espectadores aparecen aquí en cuanto abren la página del live (también en la sala de espera).",
              "Les spectateurs apparaissent ici dès qu'ils ouvrent la page du live (y compris en salle d'attente)."
            )}
          />
        ) : (
          <ul className="divide-y divide-site-line">
            {sortedViewers.map((v) => {
              // État WebRTC vu par cet onglet, sinon celui fourni par le serveur (s'il en donne un).
              const peer = peerLabel(b.peerStates[v.id] ?? v.peerState, t);
              return (
                <li key={v.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                  <span className="text-xl" aria-hidden="true">
                    {flag(v.countryCode)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{viewerLocation(v, locale)}</p>
                    <p className="text-xs text-site-gray">
                      {translateServerMessage(v.device)} · {translateServerMessage(v.browser)} · IP {v.maskedIp}
                    </p>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-site-gray">
                    {formatDuration(now - Date.parse(v.joinedAt))}
                  </span>
                  {peer ? (
                    <Badge tone={peer.tone}>{peer.label}</Badge>
                  ) : (
                    <Badge>{live ? t("Sin vídeo", "Sans vidéo") : t("En espera", "En attente")}</Badge>
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
    danger: "border-red-200 bg-site-red-l text-site-red-d",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    info: "border-[#b3e8e8] bg-[#e6f7f7] text-site-teal-d",
  };
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center ${tones[tone]}`}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="min-w-0 flex-1 font-medium">{text}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function RecordingBadge({ recording, t, locale }) {
  if (recording.status === "error") {
    return <Badge tone="overlay" className="px-3 py-1 text-xs text-red-300">{t("Grabación con error", "Erreur d'enregistrement")}</Badge>;
  }
  if (recording.status === "retrying") {
    return <Badge tone="overlay" className="px-3 py-1 text-xs text-amber-300">{t("REC · reconectando…", "REC · reconnexion…")}</Badge>;
  }
  if (recording.status === "saving") {
    return <Badge tone="overlay" className="px-3 py-1 text-xs">{t("Guardando…", "Sauvegarde…")}</Badge>;
  }
  return (
    <Badge tone="overlay" className="px-3 py-1 text-xs">
      <span className="text-site-red">●</span> REC {formatBytes(recording.bytes, locale)}
    </Badge>
  );
}
