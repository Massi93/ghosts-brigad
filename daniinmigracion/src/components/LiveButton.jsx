import { Play } from "lucide-react";
import { livePhase, useLiveStatus } from "../lib/liveStatus";
import { formatCountdown, formatLiveDate, useNow } from "../lib/time";

/**
 * Bouton « LIVE » rouge clignotant, affiché dès qu'un live est programmé.
 *
 * - Plus de 5 min avant : inactif (un clic mène au formulaire d'inscription).
 * - 5 dernières minutes  : chronomètre 05:00 → 00:00 à côté du bouton.
 * - À 00:00 ou en direct : le bouton devient actif et ouvre la page /live.
 */
export default function LiveButton() {
  const { live, offset } = useLiveStatus();
  const now = useNow(250, { enabled: Boolean(live), offset });
  const { phase, remaining } = livePhase(live, now);

  if (phase === "none") return null;

  const active = phase === "live" || phase === "ready";

  const onClick = () => {
    if (active) {
      window.location.assign("/live");
      return;
    }
    document.getElementById("proximo-live")?.scrollIntoView({ behavior: "smooth" });
  };

  const label = active
    ? "Entrar al live"
    : `Live programado: ${formatLiveDate(live.scheduledAt)}. Ver inscripción`;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className={`flex h-9 items-center gap-1.5 rounded-xl border px-2 transition active:scale-95 ${
          active
            ? "live-ring border-red-500 bg-white shadow-[0_0_24px_-4px_rgba(255,45,85,0.9)]"
            : "border-red-500/40 bg-red-500/10"
        }`}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        <span className="live-blink font-display text-[13px] font-extrabold tracking-wider text-red-500">
          LIVE
        </span>
        {phase === "live" && <Play className="h-3.5 w-3.5 fill-red-500 text-red-500" />}
      </button>

      {/* Le chronomètre reste à 00:00 tant que Dani n'a pas lancé la diffusion. */}
      {(phase === "countdown" || phase === "ready") && (
        <span
          role="timer"
          aria-label={`El live empieza en ${formatCountdown(remaining)}`}
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-1.5 py-1 font-mono text-xs font-bold tabular-nums text-red-300"
        >
          {formatCountdown(remaining)}
        </span>
      )}
    </div>
  );
}
