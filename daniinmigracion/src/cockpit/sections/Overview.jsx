import { useEffect, useState } from "react";
import { CalendarClock, ExternalLink, Film, Heart, Mail, Radio, TrendingUp, Users } from "lucide-react";
import { api } from "../../lib/api";
import { formatBytes, formatDateTime, formatDuration, formatLiveDate, splitDuration, useNow } from "../../lib/time";
import { useCockpit } from "../CockpitContext";
import { Badge, Card, MailModeBadge, SectionTitle, Stat, useToast } from "../ui";

function countdownLabel(ms) {
  const { days, hours, minutes, seconds } = splitDuration(ms);
  if (days) return `${days} d ${hours} h ${minutes} min`;
  if (hours) return `${hours} h ${minutes} min`;
  return `${minutes} min ${String(seconds).padStart(2, "0")} s`;
}

/** Vue d'ensemble : état du live, chiffres clés et accès rapides. */
export default function Overview() {
  const { live, next, stats, offset, recordingsVersion } = useCockpit();
  const toast = useToast();
  const now = useNow(1000, { offset });
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = () => api("/admin/overview").then(setData).catch((err) => toast(err.message, "error"));
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [toast, live?.id, next?.id, recordingsVersion]);

  const upcoming = next && !live ? next : null;

  return (
    <div>
      <SectionTitle title="Resumen" subtitle="Todo tu sitio y tus lives de un vistazo." />

      {/* État principal */}
      <Card className="relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-500/15 blur-3xl" />
        {live ? (
          <div className="relative flex flex-wrap items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-red-500 shadow-[0_0_30px_-6px_rgba(255,45,85,0.9)]">
              <Radio className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <Badge tone="live">
                <span className="live-blink">● EN DIRECTO</span>
              </Badge>
              <p className="mt-1 font-display text-xl font-bold">{live.title}</p>
              <p className="text-sm text-white/50">
                {formatDuration(now - Date.parse(live.startedAt))} · 👁 {stats.viewers} espectadores · ❤️ {stats.hearts}
              </p>
            </div>
            <a href="#directo" className="w-full rounded-xl bg-red-500 px-4 py-2.5 text-center text-sm font-semibold sm:w-auto">
              Ir al estudio
            </a>
          </div>
        ) : upcoming ? (
          <div className="relative flex flex-wrap items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-500 shadow-glow">
              <CalendarClock className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wider text-white/50">Próximo live</p>
              <p className="truncate font-display text-xl font-bold">{upcoming.title}</p>
              <p className="text-sm text-white/50">{formatLiveDate(upcoming.scheduledAt)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/50">Empieza en</p>
              <p className="font-mono text-lg font-bold tabular-nums">
                {countdownLabel(Date.parse(upcoming.scheduledAt) - now)}
              </p>
            </div>
          </div>
        ) : (
          <div className="relative flex flex-wrap items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
              <CalendarClock className="h-7 w-7 text-white/60" />
            </span>
            <div className="flex-1">
              <p className="font-display text-xl font-bold">Ningún live programado</p>
              <p className="text-sm text-white/50">Programa uno para que aparezca el botón LIVE en el sitio.</p>
            </div>
            <a href="#programacion" className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold sm:w-auto">
              Programar
            </a>
          </div>
        )}
      </Card>

      {/* Chiffres clés */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={Users}
          label="Inscritos activos"
          value={data?.registrations.active ?? "—"}
          hint={data ? `+${data.registrations.last7Days} en los últimos 7 días` : null}
        />
        <Stat
          icon={Heart}
          label="Me gusta (último live)"
          value={data?.lastLive?.hearts ?? "—"}
          tone="text-pink-400"
          hint={data?.lastLive ? formatDateTime(data.lastLive.startedAt) : "Sin lives pasados"}
        />
        <Stat
          icon={TrendingUp}
          label="Pico de espectadores"
          value={data?.lastLive?.peakViewers ?? "—"}
          hint="Último live"
        />
        <Stat
          icon={Film}
          label="Grabaciones"
          value={data?.recordings.count ?? "—"}
          hint={data ? formatBytes(data.recordings.bytes) : null}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* Accès rapides */}
        <Card>
          <p className="font-display font-bold">Accesos rápidos</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              ["#directo", "🎥 Estudio en directo"],
              ["#programacion", "📅 Programar un live"],
              ["#inscritos", "👥 Inscritos y emails"],
              ["#grabaciones", "🎬 Grabaciones"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
                {label}
              </a>
            ))}
            <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
              <ExternalLink className="h-4 w-4" /> Ver el sitio
            </a>
            <a href="/live" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
              <ExternalLink className="h-4 w-4" /> Página del live
            </a>
          </div>
        </Card>

        {/* Emails */}
        <Card>
          <p className="flex items-center gap-2 font-display font-bold">
            <Mail className="h-4 w-4 text-brand-300" /> Correo
          </p>
          {data && (
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <p>
                Modo:{" "}
                <MailModeBadge mail={data.mail} />
              </p>
              <p className="text-white/60">Remitente: {data.mail.from}</p>
              <p className="text-white/60">
                Últimos 30 días: ✅ {data.emails.sent} enviados · ❌ {data.emails.failed} con error
              </p>
              <p className="text-white/60">
                Recordatorios automáticos: 3 h y 5 min antes · zona de los correos: {data.timezone}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
