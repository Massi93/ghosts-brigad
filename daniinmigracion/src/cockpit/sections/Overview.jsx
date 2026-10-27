import { useEffect, useState } from "react";
import { CalendarClock, ExternalLink, Film, Heart, Mail, Radio, TrendingUp, Users } from "lucide-react";
import { api } from "../../lib/api";
import { formatBytes, formatDateTime, formatDuration, formatLiveDate, splitDuration, useNow } from "../../lib/time";
import { useCockpit } from "../CockpitContext";
import { Badge, Card, MailModeBadge, SectionTitle, Stat, useToast } from "../ui";
import { useLang } from "../i18n";

function countdownLabel(ms, t) {
  const { days, hours, minutes, seconds } = splitDuration(ms);
  if (days) return `${days} ${t("d", "j")} ${hours} h ${minutes} min`;
  if (hours) return `${hours} h ${minutes} min`;
  return `${minutes} min ${String(seconds).padStart(2, "0")} s`;
}

/** Vue d'ensemble : état du live, chiffres clés et accès rapides. */
export default function Overview() {
  const { live, next, stats, offset, recordingsVersion } = useCockpit();
  const { t, locale } = useLang();
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
      <SectionTitle
        title={t("Resumen", "Résumé")}
        subtitle={t("Todo tu sitio y tus lives de un vistazo.", "Votre site et vos lives en un coup d'œil.")}
      />

      {/* État principal */}
      <Card className="relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-site-red-l blur-3xl" />
        {live ? (
          <div className="relative flex flex-wrap items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-site-red text-white shadow-site-red">
              <Radio className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <Badge tone="live">
                <span className="live-blink">● {t("EN DIRECTO", "EN DIRECT")}</span>
              </Badge>
              <p className="mt-1 font-display text-xl font-bold">{live.title}</p>
              <p className="text-sm text-site-gray">
                {formatDuration(now - Date.parse(live.startedAt))} · 👁 {stats.viewers} {t("espectadores", "spectateurs")} · ❤️{" "}
                {stats.hearts}
              </p>
            </div>
            <a href="#directo" className="w-full rounded-full bg-gradient-to-br from-site-red to-site-red-d text-white shadow-site-red transition hover:-translate-y-px px-5 py-2.5 text-center text-sm font-bold sm:w-auto">
              {t("Ir al estudio", "Aller au studio")}
            </a>
          </div>
        ) : upcoming ? (
          <div className="relative flex flex-wrap items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-site-red text-white shadow-site-red">
              <CalendarClock className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wider text-site-gray">{t("Próximo live", "Prochain live")}</p>
              <p className="truncate font-display text-xl font-bold">{upcoming.title}</p>
              <p className="text-sm text-site-gray">{formatLiveDate(upcoming.scheduledAt, locale)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-site-gray">{t("Empieza en", "Commence dans")}</p>
              <p className="font-mono text-lg font-bold tabular-nums">
                {countdownLabel(Date.parse(upcoming.scheduledAt) - now, t)}
              </p>
            </div>
          </div>
        ) : (
          <div className="relative flex flex-wrap items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-site-bg">
              <CalendarClock className="h-7 w-7 text-site-text" />
            </span>
            <div className="flex-1">
              <p className="font-display text-xl font-bold">{t("Ningún live programado", "Aucun live programmé")}</p>
              <p className="text-sm text-site-gray">
                {t(
                  "Programa uno para que aparezca el botón LIVE en el sitio.",
                  "Programmez-en un pour faire apparaître le bouton LIVE sur le site."
                )}
              </p>
            </div>
            <a href="#programacion" className="w-full rounded-full bg-gradient-to-br from-site-red to-site-red-d text-white shadow-site-red transition hover:-translate-y-px px-5 py-2.5 text-center text-sm font-bold sm:w-auto">
              {t("Programar", "Programmer")}
            </a>
          </div>
        )}
      </Card>

      {/* Chiffres clés */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0">
        <Stat
          icon={Users}
          label={t("Inscritos activos", "Inscrits actifs")}
          value={data?.registrations.active ?? "—"}
          hint={data ? t(`+${data.registrations.last7Days} en los últimos 7 días`, `+${data.registrations.last7Days} ces 7 derniers jours`) : null}
        />
        <Stat
          icon={Heart}
          label={t("Me gusta (último live)", "J'aime (dernier live)")}
          value={data?.lastLive?.hearts ?? "—"}
          tone="text-pink-400"
          hint={data?.lastLive ? formatDateTime(data.lastLive.startedAt, locale) : t("Sin lives pasados", "Aucun live passé")}
        />
        <Stat
          icon={TrendingUp}
          label={t("Pico de espectadores", "Pic de spectateurs")}
          value={data?.lastLive?.peakViewers ?? "—"}
          hint={t("Último live", "Dernier live")}
        />
        <Stat
          icon={Film}
          label={t("Grabaciones", "Enregistrements")}
          value={data?.recordings.count ?? "—"}
          hint={data ? formatBytes(data.recordings.bytes, locale) : null}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        {/* Accès rapides */}
        <Card>
          <p className="font-display font-bold">{t("Accesos rápidos", "Accès rapides")}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              ["#directo", t("🎥 Estudio en directo", "🎥 Studio en direct")],
              ["#programacion", t("📅 Programar un live", "📅 Programmer un live")],
              ["#inscritos", t("👥 Inscritos y emails", "👥 Inscrits et e-mails")],
              ["#grabaciones", t("🎬 Grabaciones", "🎬 Enregistrements")],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-2xl border border-site-line bg-site-bg px-4 py-3 text-sm font-semibold hover:bg-[#eef1f6]">
                {label}
              </a>
            ))}
            <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl border border-site-line bg-site-bg px-4 py-3 text-sm font-semibold hover:bg-[#eef1f6]">
              <ExternalLink className="h-4 w-4" /> {t("Ver el sitio", "Voir le site")}
            </a>
            <a href="/live" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl border border-site-line bg-site-bg px-4 py-3 text-sm font-semibold hover:bg-[#eef1f6]">
              <ExternalLink className="h-4 w-4" /> {t("Página del live", "Page du live")}
            </a>
          </div>
        </Card>

        {/* Emails */}
        <Card>
          <p className="flex items-center gap-2 font-display font-bold">
            <Mail className="h-4 w-4 text-site-red" /> {t("Correo", "E-mails")}
          </p>
          {data && (
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <p>
                {t("Modo:", "Mode :")} <MailModeBadge mail={data.mail} />
              </p>
              <p className="text-site-text">
                {t("Remitente:", "Expéditeur :")} {data.mail.from}
              </p>
              <p className="text-site-text">
                {t(
                  `Últimos 30 días: ✅ ${data.emails.sent} enviados · ❌ ${data.emails.failed} con error`,
                  `30 derniers jours : ✅ ${data.emails.sent} envoyés · ❌ ${data.emails.failed} en erreur`
                )}
              </p>
              <p className="text-site-text">
                {t(
                  `Recordatorios automáticos: 3 h y 5 min antes · zona de los correos: ${data.timezone}`,
                  `Rappels automatiques : 3 h et 5 min avant · fuseau des e-mails : ${data.timezone}`
                )}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
