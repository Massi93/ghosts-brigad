/**
 * Page /live quand la vidéo n'est pas affichée (avant le début, entre deux lives,
 * live terminé ou complet) : page claire aux couleurs du site, pensée d'abord
 * pour le téléphone. Date, compte à rebours, ajout à l'agenda et inscription.
 */
import { useEffect, useState } from "react";
import { ArrowLeft, BellRing, CalendarPlus, CheckCircle2, Loader2, Play, Users } from "lucide-react";
import { api } from "../lib/api";
import { formatCountdown, formatLiveDate, splitDuration } from "../lib/time";
import logoUrl from "../assets/logo-dani.jpg";

const STORAGE_KEY = "dani_live_registration"; // partagé avec le bouton LIVE du site (widget.js)

function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}
function save(value) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // stockage indisponible : sans conséquence
  }
}

/** Fichier .ics (Agenda iPhone, Google Agenda, Outlook) avec un rappel 15 min avant. */
function downloadCalendar(live, title) {
  const stamp = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(live.scheduledAt);
  const end = new Date(start.getTime() + 3600_000);
  const url = `${window.location.origin}/live`;
  const escape = (text) => String(text).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dani Inmigracion//Live//ES",
    "BEGIN:VEVENT",
    `UID:live-${live.id}@daniinmigracion.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(`🔴 ${title}`)}`,
    `DESCRIPTION:${escape(url)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  link.download = "live-dani-inmigracion.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
}

/** Compte à rebours en cases (jours / heures / min / s), ou 05:00 les 5 dernières minutes. */
function Countdown({ remaining, units }) {
  if (remaining <= 5 * 60_000) {
    return (
      <p role="timer" className="font-mono text-6xl font-bold tabular-nums tracking-tight text-site-red">
        {formatCountdown(remaining)}
      </p>
    );
  }
  const { days, hours, minutes, seconds } = splitDuration(remaining);
  const items = [days, hours, minutes, seconds]
    .map((value, i) => ({ value, label: units[i] }))
    .filter((item, i) => i > 0 || item.value > 0);
  return (
    <div role="timer" className="grid auto-cols-fr grid-flow-col gap-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-site-line bg-site-soft px-1 py-3 text-center">
          <p className="text-3xl font-black tabular-nums text-site-ink">{String(item.value).padStart(2, "0")}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-site-gray">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function RegistrationCard({ T, lang, live }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", website: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(null);

  useEffect(() => setSaved(readSaved()), []);
  const already = saved && (!live || saved.liveId === live.id) && status !== "done";

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      await api("/public/registrations", { method: "POST", body: { ...form, lang } });
      const value = { firstName: form.firstName.trim(), liveId: live?.id ?? null };
      save(value);
      setSaved(value);
      setStatus("done");
      setForm({ firstName: "", lastName: "", email: "", website: "" });
    } catch (err) {
      setError(
        err.code === "invalid_email"
          ? T.errEmail
          : err.code === "invalid_nombre" || err.code === "invalid_apellido"
            ? T.errName
            : err.status === 429
              ? T.errRate
              : T.errGeneric
      );
      setStatus("error");
    }
  };

  if (status === "done" || already) {
    return (
      <div className="flex flex-col items-center py-4 text-center" aria-live="polite">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <p className="mt-4 text-lg font-extrabold">{T.done(saved?.firstName)}</p>
        <p className="mt-1 text-sm text-site-gray">{T.formSub}</p>
        <button
          type="button"
          onClick={() => {
            save(null);
            setSaved(null);
            setStatus("idle");
          }}
          className="mt-4 text-sm font-semibold text-site-red underline underline-offset-4"
        >
          {T.another}
        </button>
      </div>
    );
  }

  const input =
    "w-full rounded-[11px] border-[1.5px] border-site-line bg-site-soft px-4 py-3 text-base text-site-ink outline-none transition focus:border-site-teal focus:bg-white focus:ring-4 focus:ring-[rgba(0,180,180,0.1)]";
  const label = "flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-site-ink";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="flex items-center justify-center gap-2 text-center text-lg font-extrabold">
        <BellRing className="h-5 w-5 text-site-red" /> {T.formTitle}
      </p>
      <p className="-mt-1 mb-1 text-center text-sm text-site-gray">{T.formSub}</p>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          {T.firstName}
          <input className={input} required maxLength={80} autoComplete="given-name" value={form.firstName} onChange={update("firstName")} />
        </label>
        <label className={label}>
          {T.lastName}
          <input className={input} required maxLength={80} autoComplete="family-name" value={form.lastName} onChange={update("lastName")} />
        </label>
      </div>
      <label className={label}>
        {T.email}
        <input
          className={input}
          type="email"
          inputMode="email"
          required
          maxLength={254}
          autoComplete="email"
          autoCapitalize="none"
          value={form.email}
          onChange={update("email")}
        />
      </label>
      {/* Champ piège anti-robots, invisible pour les humains */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={form.website}
        onChange={update("website")}
        className="absolute -left-[9999px] h-px w-px opacity-0"
      />
      {status === "error" && (
        <p role="alert" className="rounded-[10px] bg-site-red-l px-3 py-2 text-sm font-semibold text-site-red-d">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-1 flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-br from-site-red to-site-red-d px-6 text-sm font-bold uppercase tracking-wider text-white shadow-site-red transition active:scale-[0.98] disabled:opacity-60"
      >
        {status === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
        {status === "sending" ? T.sending : T.submit}
      </button>
      <p className="text-center text-xs leading-relaxed text-site-gray">{T.privacy}</p>
    </form>
  );
}

/**
 * @param {object} props
 * @param {"none"|"scheduled"|"countdown"|"ready"|"live"} props.phase
 * @param {"waiting"|"ended"|"full"} props.mode raison de l'affichage
 */
export default function Lobby({ live, phase, remaining, mode, T, lang, locale }) {
  const title = live?.title || T.defaultTitle;
  const scheduled = (phase === "scheduled" || phase === "countdown") && live?.scheduledAt;

  let heading;
  let lead = null;
  if (mode === "ended") {
    heading = T.endedTitle;
    lead = `${T.endedText} ${T.endedLead}`;
  } else if (mode === "full") {
    heading = T.fullTitle;
    lead = `${T.fullText} ${T.fullLead}`;
  } else if (phase === "none") {
    heading = T.noneTitle;
    lead = T.noneLead;
  } else {
    heading = title;
  }

  return (
    <div className="site-theme min-h-[100dvh] bg-site-bg text-site-ink">
      <div className="site-stripe" />
      <header className="sticky top-0 z-10 border-b border-site-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <a
            href="/"
            aria-label={T.back}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-site-line bg-white text-site-ink active:scale-95"
          >
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </a>
          <a href="/" className="flex min-w-0 items-center gap-2.5">
            <img src={logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full bg-white shadow-[0_3px_14px_rgba(0,0,0,0.12)]" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[15px] font-extrabold">Dani Inmigración</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-site-gray">Live</span>
            </span>
          </a>
          {phase === "live" && mode !== "ended" && (
            <span className="ms-auto flex items-center gap-1.5 rounded-full bg-site-red px-3 py-1.5 text-xs font-bold text-white">
              <span className="live-blink">●</span> LIVE
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-4 px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] lg:grid-cols-2 lg:gap-6 lg:py-10">
        {/* Le live : titre, date, compte à rebours */}
        <section className="relative overflow-hidden rounded-[22px] border border-site-line bg-white p-5 shadow-site-card sm:p-7">
          <div className="site-line-accent absolute left-1/2 top-0 h-[3px] w-3/5 -translate-x-1/2 rounded-b" />
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-site-red">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-site-red opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-site-red" />
            </span>
            {phase === "live" && mode === "full" ? T.liveLabel : T.label}
          </p>
          <h1 className="mt-3 text-[1.75rem] font-black leading-tight tracking-tight sm:text-4xl">{heading}</h1>
          <div className="site-line-accent mt-3 h-[3px] w-14 rounded-full" />
          {lead && <p className="mt-4 text-[15px] leading-relaxed text-site-text">{lead}</p>}

          {scheduled && mode === "waiting" && (
            <>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-site-gray">{T.dateLabel}</p>
              <p className="mt-1 text-lg font-extrabold leading-snug">{formatLiveDate(live.scheduledAt, locale)}</p>
              <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wider text-site-gray">{T.startsIn}</p>
              <Countdown remaining={remaining} units={T.units} />
              <button
                type="button"
                onClick={() => downloadCalendar(live, title)}
                className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-site-line bg-white px-5 text-sm font-bold text-site-ink transition active:scale-[0.98]"
              >
                <CalendarPlus className="h-4 w-4 text-site-red" /> {T.addToCalendar}
              </button>
              <p className="mt-3 text-center text-xs text-site-gray">{T.autoRefresh}</p>
            </>
          )}

          {phase === "ready" && mode === "waiting" && (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-site-bg px-4 py-6 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-site-red" />
              <p className="font-semibold">{T.daniSoon}</p>
              <p className="text-xs text-site-gray">{T.autoRefresh}</p>
            </div>
          )}

          {mode === "full" && (
            <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-site-gray">
              <Users className="h-4 w-4" /> <Loader2 className="h-4 w-4 animate-spin" />
            </p>
          )}
        </section>

        {/* Inscription (rappels par email) */}
        {mode !== "full" && (
          <section className="relative overflow-hidden rounded-[22px] border border-site-line bg-white p-5 shadow-site-card sm:p-7">
            <div className="site-line-accent absolute left-1/2 top-0 h-[3px] w-3/5 -translate-x-1/2 rounded-b" />
            <RegistrationCard T={T} lang={lang} live={live} />
          </section>
        )}

        {mode === "full" && phase === "live" && (
          <a
            href="/live"
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-br from-site-red to-site-red-d px-6 text-sm font-bold text-white shadow-site-red"
          >
            <Play className="h-4 w-4 fill-white" /> {T.watchNow}
          </a>
        )}
      </main>
    </div>
  );
}
