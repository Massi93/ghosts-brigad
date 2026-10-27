import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Expand, Eye, Heart, Loader2, Maximize2, Shrink, VolumeX, WifiOff } from "lucide-react";
import HeartsLayer from "./Hearts";
import Lobby from "./Lobby";
import { useViewerStream } from "./useViewerStream";
import { getPublicSocket } from "../lib/socket";
import { livePhase, useLiveStatus } from "../lib/liveStatus";
import { formatDuration, useNow } from "../lib/time";
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
 * Garde l'écran du téléphone allumé pendant le live (API Wake Lock :
 * iPhone iOS 16.4+, Android). Relancé quand la page redevient visible.
 */
function useWakeLock(active) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return undefined;
    let lock = null;
    let disposed = false;
    const request = async () => {
      try {
        if (document.visibilityState === "visible" && !disposed) lock = await navigator.wakeLock.request("screen");
      } catch {
        // refusé (économie d'énergie…) : sans conséquence
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [active]);
}

/**
 * Page du live (/live), pensée d'abord pour le téléphone.
 *  - Avant / après le live : page claire aux couleurs du site (Lobby) avec
 *    compte à rebours, ajout à l'agenda et inscription aux rappels.
 *  - Pendant le live : vidéo plein écran. Le viewer regarde seulement (ni chat,
 *    ni commentaires, ni micro) ; il peut envoyer des cœurs (bouton ou double-tap).
 */
export default function LivePage() {
  const socket = getPublicSocket();
  const { live, offset, loaded, connected } = useLiveStatus();
  const now = useNow(1000, { offset });
  const { phase, remaining } = livePhase(live, now);

  const [ended, setEnded] = useState(false);
  const [stats, setStats] = useState({ viewers: 0, hearts: 0 });
  const [needsSound, setNeedsSound] = useState(false);
  const [fill, setFill] = useState(false); // vidéo recadrée pour remplir l'écran

  const joinEnabled = loaded && phase !== "none" && !ended;
  const { stream, state } = useViewerStream(socket, joinEnabled);

  const videoRef = useRef(null);
  const backdropRef = useRef(null);
  const heartsRef = useRef(null);
  const stageRef = useRef(null);
  const pendingHearts = useRef(0);
  const lastTap = useRef(0);

  const isLive = phase === "live" && !ended;
  const showStage = isLive && state !== "full";

  useEffect(() => {
    document.title = "🔴 Live · Dani Inmigración";
    document.documentElement.lang = LANG;
    document.documentElement.dir = LANG === "ar" ? "rtl" : "ltr";
  }, []);

  // Couleur de la barre du navigateur : claire hors live, noire pendant la vidéo.
  useEffect(() => {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = showStage ? "#000000" : "#ffffff";
    document.body.style.background = showStage ? "#000" : "#f6f8fb";
  }, [showStage]);

  useWakeLock(showStage && Boolean(stream));

  // Statistiques, cœurs des autres viewers et fin du live.
  useEffect(() => {
    // Le total du serveur peut être en retard sur les cœurs que l'on vient d'envoyer : il ne fait que monter.
    const onStats = (s) => setStats((prev) => ({ ...prev, viewers: s.viewers, hearts: Math.max(prev.hearts, s.hearts) }));
    const onHearts = ({ n, total }) => {
      if (n > 0) heartsRef.current?.burst(n);
      setStats((prev) => ({ ...prev, hearts: Math.max(prev.hearts, total) }));
    };
    const onEnded = (data) => {
      endedId.current = data?.liveId ?? prevLive.current?.id ?? null;
      setEnded(true);
    };
    socket.on("live:stats", onStats);
    socket.on("hearts", onHearts);
    socket.on("live:ended", onEnded);
    return () => {
      socket.off("live:stats", onStats);
      socket.off("hearts", onHearts);
      socket.off("live:ended", onEnded);
    };
  }, [socket]);

  // Valeurs initiales fournies par l'état public, et fin du live vue par l'état public
  // (si le téléphone a perdu la connexion au moment où « live:ended » a été envoyé).
  const prevLive = useRef(null);
  const endedId = useRef(null);
  const statsLiveId = useRef(null);
  useEffect(() => {
    const prev = prevLive.current;
    prevLive.current = live;
    if (live?.status === "live") {
      setEnded(false);
      const fresh = statsLiveId.current !== live.id; // nouveau live : compteurs remis à zéro
      statsLiveId.current = live.id;
      setStats((p) => ({
        viewers: live.viewers ?? p.viewers,
        hearts: Math.max(fresh ? 0 : p.hearts, live.hearts ?? 0),
      }));
      return;
    }
    if (prev?.status === "live" && live?.id !== prev.id) {
      endedId.current = prev.id;
      setEnded(true);
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
  // Relancé quand la scène vidéo apparaît (début du live) ou que le flux change.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (backdropRef.current) backdropRef.current.srcObject = stream;
    if (!stream) return;
    video.muted = false;
    video.play().catch(() => {
      // Son bloqué par le navigateur (iPhone…) : lecture en muet, un toucher active le son.
      video.muted = true;
      setNeedsSound(true);
      video.play().catch(() => {});
    });
    backdropRef.current?.play().catch(() => {});
  }, [stream, showStage]);

  const sendHeart = useCallback(() => {
    if (!isLive) return;
    pendingHearts.current += 1;
    heartsRef.current?.burst(1, { mine: true });
    setStats((prev) => ({ ...prev, hearts: prev.hearts + 1 }));
    if (navigator.vibrate) navigator.vibrate(8);
  }, [isLive]);

  const enableSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.play().catch(() => {});
    setNeedsSound(false);
  };

  // Toucher la vidéo : le premier active le son, puis double-tap = gros cœur.
  const onStageTap = (e) => {
    if (!isLive) return;
    if (needsSound) {
      enableSound();
      return;
    }
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

  const canFullscreen = typeof document !== "undefined" && document.fullscreenEnabled;
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else stageRef.current?.requestFullscreen?.().catch(() => {});
  };

  if (!loaded) {
    return (
      <div className="site-theme grid min-h-[100dvh] place-items-center bg-site-bg">
        <Loader2 className="h-8 w-8 animate-spin text-site-red" />
      </div>
    );
  }

  if (!showStage) {
    return (
      <Lobby
        live={live}
        phase={phase}
        remaining={remaining}
        mode={ended ? "ended" : state === "full" ? "full" : "waiting"}
        T={T}
        lang={LANG}
        locale={LOCALE}
      />
    );
  }

  const startedAt = live?.startedAt ? Date.parse(live.startedAt) : null;
  const stop = (e) => e.stopPropagation();

  return (
    <div
      ref={stageRef}
      onPointerUp={onStageTap}
      className="fixed inset-0 h-[100dvh] w-full touch-manipulation select-none overflow-hidden bg-black font-['Inter',ui-sans-serif,system-ui,sans-serif] text-white [-webkit-touch-callout:none]"
    >
      {/* Vidéo : copie floutée plein cadre derrière (mode « ajusté »), image devant */}
      <video
        ref={backdropRef}
        muted
        playsInline
        autoPlay
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-xl ${stream && !fill ? "" : "hidden"}`}
      />
      <video
        ref={videoRef}
        playsInline
        autoPlay
        className={`absolute inset-0 h-full w-full ${fill ? "object-cover" : "object-contain"} ${stream ? "" : "hidden"}`}
      />

      {/* Dégradés pour la lisibilité des infos */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />

      {/* Connexion à la vidéo en cours */}
      {!stream && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(ellipse_at_center,#2a1218,#000)] px-8 text-center">
          <Loader2 className="h-9 w-9 animate-spin text-white/80" />
          <p className="text-sm text-white/80">{live?.interrupted ? T.waitingDani : T.connecting}</p>
        </div>
      )}

      {/* Barre du haut */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-3">
          <a
            href="/"
            onPointerUp={stop}
            aria-label={T.back}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black/40 backdrop-blur active:scale-90"
          >
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </a>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{live?.title || T.defaultTitle}</p>
            <p className="text-xs text-white/60">Dani Inmigración</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-md bg-[#c60b1e] px-2 py-1 text-xs font-extrabold tracking-wider">
              <span className="live-blink">LIVE</span>
              {startedAt && <span className="font-mono font-semibold tabular-nums">{formatDuration(now - startedAt)}</span>}
            </span>
            <span className="flex items-center gap-1 rounded-md bg-black/40 px-2 py-1 text-xs font-semibold backdrop-blur">
              <Eye className="h-3.5 w-3.5" /> {compact(stats.viewers)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {stream && (
              <button
                type="button"
                onPointerUp={stop}
                onClick={() => setFill((v) => !v)}
                aria-label={fill ? T.fit : T.fill}
                title={fill ? T.fit : T.fill}
                className="grid h-9 w-9 place-items-center rounded-full bg-black/40 backdrop-blur active:scale-90"
              >
                {fill ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
              </button>
            )}
            {canFullscreen && (
              <button
                type="button"
                onPointerUp={stop}
                onClick={toggleFullscreen}
                aria-label={T.fullscreen}
                className="hidden h-9 w-9 place-items-center rounded-full bg-black/40 backdrop-blur sm:grid"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Reconnexion / son */}
      {!connected && stream && <Notice icon={WifiOff} text={T.offline} />}
      {connected && live?.interrupted && stream && <Notice icon={WifiOff} text={T.reconnecting} />}
      {!live?.interrupted && stream && needsSound && (
        <button
          type="button"
          // Activé dès le relâchement du doigt (un « click » pourrait tomber à côté du bouton).
          onPointerUp={(e) => {
            stop(e);
            enableSound();
          }}
          onClick={enableSound}
          className="absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-white px-5 py-3 text-sm font-bold text-[#0f1020] shadow-lg"
        >
          <VolumeX className="h-5 w-5 text-[#c60b1e]" /> {T.tapSound}
        </button>
      )}

      <HeartsLayer ref={heartsRef} />

      {/* Bouton « me gusta » */}
      <div className="absolute bottom-0 right-0 z-30 flex flex-col items-center gap-1 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))]">
        <button
          type="button"
          onPointerUp={stop}
          onClick={sendHeart}
          aria-label={T.sendHeart}
          className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-pink-400 to-red-500 shadow-[0_10px_30px_-6px_rgba(255,45,85,0.8)] transition active:scale-90"
        >
          <Heart className="h-8 w-8 fill-white text-white" />
        </button>
        <span className="text-xs font-bold tabular-nums drop-shadow">{compact(stats.hearts)}</span>
      </div>

      {stream && !needsSound && (
        <p className="pointer-events-none absolute bottom-0 left-0 z-30 max-w-[60%] p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] text-xs text-white/70">
          {T.doubleTap}
        </p>
      )}
    </div>
  );
}

function Notice({ icon: Icon, text }) {
  return (
    <div className="absolute left-1/2 top-28 z-30 flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm backdrop-blur">
      <Icon className="h-4 w-4 shrink-0 text-[#f1bf00]" /> <span className="truncate">{text}</span>
    </div>
  );
}
