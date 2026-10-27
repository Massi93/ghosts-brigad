import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, Heart, Loader2, Maximize2, Radio, VolumeX, WifiOff } from "lucide-react";
import HeartsLayer from "./Hearts";
import { useViewerStream } from "./useViewerStream";
import { getPublicSocket } from "../lib/socket";
import { livePhase, useLiveStatus } from "../lib/liveStatus";
import { formatCountdown, formatDuration, formatLiveDate, splitDuration, useNow } from "../lib/time";
import { intlLocale, liveTexts, pageLang } from "./i18n";

const HEART_FLUSH_MS = 200;
const DOUBLE_TAP_MS = 300;

// Langue du site (es, fr, ar), choisie une fois à l'ouverture de la page.
const LANG = pageLang();
const LOCALE = intlLocale(LANG);
const T = liveTexts(LANG);

/** « 1,2 K » pour les grands nombres. */
const compact = (n) => new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 }).format(n);

/**
 * Page de visionnage du live (/live), plein écran, responsive.
 * Le viewer regarde seulement : ni chat, ni commentaires, ni micro.
 * Seule interaction : envoyer des cœurs (bouton ou double-tap sur la vidéo).
 */
export default function LivePage() {
  const socket = getPublicSocket();
  const { live, offset, loaded } = useLiveStatus();
  const now = useNow(1000, { offset });
  const { phase, remaining } = livePhase(live, now);

  const [ended, setEnded] = useState(false);
  const [stats, setStats] = useState({ viewers: 0, hearts: 0 });
  const [needsSound, setNeedsSound] = useState(false);

  const joinEnabled = loaded && phase !== "none" && !ended;
  const { stream, state } = useViewerStream(socket, joinEnabled);

  const videoRef = useRef(null);
  const backdropRef = useRef(null);
  const heartsRef = useRef(null);
  const stageRef = useRef(null);
  const pendingHearts = useRef(0);
  const lastTap = useRef(0);

  useEffect(() => {
    document.title = "🔴 Live · Dani Inmigración";
    document.documentElement.lang = LANG;
    document.documentElement.dir = LANG === "ar" ? "rtl" : "ltr";
  }, []);

  // Statistiques, cœurs des autres viewers et fin du live.
  useEffect(() => {
    const onStats = (s) => setStats((prev) => ({ ...prev, viewers: s.viewers, hearts: s.hearts }));
    const onHearts = ({ n, total }) => {
      if (n > 0) heartsRef.current?.burst(n);
      setStats((prev) => ({ ...prev, hearts: Math.max(prev.hearts, total) }));
    };
    const onEnded = () => setEnded(true);
    socket.on("live:stats", onStats);
    socket.on("hearts", onHearts);
    socket.on("live:ended", onEnded);
    return () => {
      socket.off("live:stats", onStats);
      socket.off("hearts", onHearts);
      socket.off("live:ended", onEnded);
    };
  }, [socket]);

  // Valeurs initiales fournies par l'état public.
  useEffect(() => {
    if (live?.status === "live") {
      setEnded(false);
      setStats((prev) => ({
        viewers: live.viewers ?? prev.viewers,
        hearts: Math.max(prev.hearts, live.hearts ?? 0),
      }));
    }
  }, [live]);

  // Envoi groupé des cœurs au serveur (au plus 5 fois par seconde).
  useEffect(() => {
    const id = setInterval(() => {
      if (pendingHearts.current > 0) {
        socket.emit("hearts", { n: pendingHearts.current });
        pendingHearts.current = 0;
      }
    }, HEART_FLUSH_MS);
    return () => clearInterval(id);
  }, [socket]);

  // Branchement du flux sur la vidéo (+ copie floutée en arrière-plan).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (backdropRef.current) backdropRef.current.srcObject = stream;
    if (!stream) return;
    video.muted = false;
    video.play().catch(() => {
      // Lecture automatique avec son bloquée par le navigateur : on démarre en muet.
      video.muted = true;
      setNeedsSound(true);
      video.play().catch(() => {});
    });
    backdropRef.current?.play().catch(() => {});
  }, [stream]);

  const isLive = phase === "live" && !ended;

  const sendHeart = useCallback(() => {
    if (!isLive) return;
    pendingHearts.current += 1;
    heartsRef.current?.burst(1, { mine: true });
    setStats((prev) => ({ ...prev, hearts: prev.hearts + 1 }));
    if (navigator.vibrate) navigator.vibrate(8);
  }, [isLive]);

  // Double-tap sur la vidéo : gros cœur à l'endroit touché.
  const onStageTap = (e) => {
    if (!isLive) return;
    const t = Date.now();
    if (t - lastTap.current < DOUBLE_TAP_MS) {
      const rect = stageRef.current.getBoundingClientRect();
      heartsRef.current?.pop(e.clientX - rect.left, e.clientY - rect.top);
      sendHeart();
      lastTap.current = 0;
    } else {
      lastTap.current = t;
    }
  };

  const enableSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.play().catch(() => {});
    setNeedsSound(false);
  };

  const canFullscreen = typeof document !== "undefined" && document.fullscreenEnabled;
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else stageRef.current?.requestFullscreen?.().catch(() => {});
  };

  const startedAt = live?.startedAt ? Date.parse(live.startedAt) : null;

  return (
    <div
      ref={stageRef}
      onPointerUp={onStageTap}
      className="fixed inset-0 h-[100dvh] w-full touch-manipulation select-none overflow-hidden bg-black text-white"
    >
      {/* Vidéo : copie floutée plein cadre derrière, image complète devant */}
      <video
        ref={backdropRef}
        muted
        playsInline
        autoPlay
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl ${stream && isLive ? "" : "hidden"}`}
      />
      <video
        ref={videoRef}
        playsInline
        autoPlay
        className={`absolute inset-0 h-full w-full object-contain ${stream && isLive ? "" : "hidden"}`}
      />

      {/* Dégradés pour la lisibilité des infos */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />

      {/* États sans vidéo (attente, fin, aucun live…) */}
      {!(stream && isLive) && (
        <StatusScreen
          loaded={loaded}
          phase={phase}
          ended={ended}
          state={state}
          live={live}
          remaining={remaining}
        />
      )}

      {/* Barre du haut */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-3">
          <a
            href="/"
            onPointerUp={(e) => e.stopPropagation()}
            aria-label={T.back}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/40 backdrop-blur active:scale-90"
          >
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </a>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold">{live?.title || T.defaultTitle}</p>
            <p className="text-xs text-white/60">Dani Inmigración</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isLive && (
            <>
              <span className="flex items-center gap-1.5 rounded-md bg-red-500 px-2 py-1 text-xs font-extrabold tracking-wider">
                <span className="live-blink">LIVE</span>
                {startedAt && <span className="font-mono font-semibold tabular-nums">{formatDuration(now - startedAt)}</span>}
              </span>
              <span className="flex items-center gap-1 rounded-md bg-black/40 px-2 py-1 text-xs font-semibold backdrop-blur">
                <Eye className="h-3.5 w-3.5" /> {compact(stats.viewers)}
              </span>
            </>
          )}
          {canFullscreen && (
            <button
              type="button"
              onPointerUp={(e) => e.stopPropagation()}
              onClick={toggleFullscreen}
              aria-label={T.fullscreen}
              className="hidden h-8 w-8 place-items-center rounded-md bg-black/40 backdrop-blur sm:grid"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Reconnexion / son */}
      {isLive && live?.interrupted && (
        <Notice icon={WifiOff} text={T.reconnecting} />
      )}
      {isLive && !live?.interrupted && stream && needsSound && (
        <button
          type="button"
          onPointerUp={(e) => e.stopPropagation()}
          onClick={enableSound}
          className="absolute left-1/2 top-24 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-lg active:scale-95"
        >
          <VolumeX className="h-4 w-4" /> {T.enableSound}
        </button>
      )}

      <HeartsLayer ref={heartsRef} />

      {/* Bouton « me gusta » */}
      {isLive && (
        <div className="absolute bottom-0 right-0 z-30 flex flex-col items-center gap-1 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onPointerUp={(e) => e.stopPropagation()}
            onClick={sendHeart}
            aria-label={T.sendHeart}
            className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-pink-400 to-red-500 shadow-[0_10px_30px_-6px_rgba(255,45,85,0.8)] transition active:scale-90"
          >
            <Heart className="h-8 w-8 fill-white text-white" />
          </button>
          <span className="text-xs font-bold tabular-nums drop-shadow">{compact(stats.hearts)}</span>
        </div>
      )}

      {isLive && stream && (
        <p className="pointer-events-none absolute bottom-0 left-0 z-30 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-xs text-white/60">
          {T.doubleTap}
        </p>
      )}
    </div>
  );
}

function Notice({ icon: Icon, text }) {
  return (
    <div className="absolute left-1/2 top-24 z-30 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-black/60 px-4 py-2 text-sm backdrop-blur">
      <Icon className="h-4 w-4 text-gold-400" /> {text}
    </div>
  );
}

/** Écran central quand la vidéo n'est pas (encore) affichée. */
function StatusScreen({ loaded, phase, ended, state, live, remaining }) {
  let content;

  if (!loaded) {
    content = <Loader2 className="h-8 w-8 animate-spin text-white/70" />;
  } else if (ended) {
    content = (
      <>
        <p className="text-5xl">💙</p>
        <h1 className="mt-4 font-display text-2xl font-extrabold">{T.endedTitle}</h1>
        <p className="mt-2 text-sm text-white/60">{T.endedText}</p>
        <a href="/#proximo-live" className="btn-primary mt-6">{T.notifyNext}</a>
      </>
    );
  } else if (state === "full") {
    content = (
      <>
        <h1 className="font-display text-2xl font-extrabold">{T.fullTitle}</h1>
        <p className="mt-2 text-sm text-white/60">{T.fullText}</p>
      </>
    );
  } else if (phase === "none") {
    content = (
      <>
        <Radio className="h-10 w-10 text-white/40" />
        <h1 className="mt-4 font-display text-2xl font-extrabold">{T.noneTitle}</h1>
        <p className="mt-2 text-sm text-white/60">{T.noneText}</p>
        <a href="/#proximo-live" className="btn-primary mt-6">{T.register}</a>
      </>
    );
  } else if (phase === "live") {
    content = (
      <>
        <Loader2 className="h-8 w-8 animate-spin text-white/70" />
        <p className="mt-4 text-sm text-white/70">
          {live?.interrupted ? T.waitingDani : T.connecting}
        </p>
      </>
    );
  } else {
    // Programmé : salle d'attente avec compte à rebours.
    const { days, hours } = splitDuration(remaining);
    content = (
      <>
        <span className="flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">
          <span className="live-blink">●</span> {T.soon}
        </span>
        <h1 className="mt-4 font-display text-2xl font-extrabold">{live.title}</h1>
        <p className="mt-1 text-sm text-white/60">{formatLiveDate(live.scheduledAt, LOCALE)}</p>
        {phase === "ready" ? (
          <p className="mt-6 text-sm text-white/80">{T.daniSoon}</p>
        ) : (
          <p className="mt-6 font-mono text-5xl font-bold tabular-nums">
            {days || hours ? `${days ? `${days}d ` : ""}${hours}h ${String(Math.floor((remaining % 3600_000) / 60_000)).padStart(2, "0")}m` : formatCountdown(remaining)}
          </p>
        )}
        <p className="mt-3 text-xs text-white/40">{T.autoRefresh}</p>
      </>
    );
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,#16224a,#0b1220)] px-8 text-center">
      {content}
    </div>
  );
}
