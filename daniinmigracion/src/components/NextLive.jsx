import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BellRing, CalendarClock, CheckCircle2, Loader2, Play, Radio } from "lucide-react";
import Reveal from "./Reveal";
import { api } from "../lib/api";
import { livePhase, useLiveStatus } from "../lib/liveStatus";
import { formatLiveDate, splitDuration, useNow } from "../lib/time";

const STORAGE_KEY = "dani_live_registration";

/** Lecture/écriture protégées (navigation privée, stockage bloqué…). */
function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}
function save(value) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // stockage indisponible : sans conséquence
  }
}

/** Compte à rebours jours / heures / minutes / secondes. */
function Countdown({ remaining }) {
  const { days, hours, minutes, seconds } = splitDuration(remaining);
  const items = [
    ...(days ? [{ value: days, label: days === 1 ? "día" : "días" }] : []),
    { value: hours, label: "horas" },
    { value: minutes, label: "min" },
    { value: seconds, label: "seg" },
  ];
  return (
    <div className="mt-4 grid grid-flow-col gap-2" aria-label="Cuenta atrás">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-2 py-2.5 text-center">
          <p className="font-display text-xl font-extrabold tabular-nums">
            {String(item.value).padStart(2, "0")}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-white/50">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Rubrique « Próximo live » : date du prochain live + formulaire d'inscription
 * (nom, prénom, email). Les inscrits reçoivent un rappel 3 h et 5 min avant.
 */
export default function NextLive() {
  const { live, site, offset, loaded } = useLiveStatus();
  const now = useNow(1000, { enabled: Boolean(live), offset });
  const { phase, remaining } = livePhase(live, now);

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", website: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(null);

  useEffect(() => setSaved(readSaved()), []);

  if (!loaded || !site?.liveSectionEnabled) return null;

  const alreadyRegistered = saved && (!live || saved.liveId === live.id) && status !== "done";

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      await api("/public/registrations", { method: "POST", body: form });
      const value = { firstName: form.firstName.trim(), liveId: live?.id ?? null };
      save(value);
      setSaved(value);
      setStatus("done");
      setForm({ firstName: "", lastName: "", email: "", website: "" });
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  };

  return (
    <section id="proximo-live" className="container-app scroll-mt-20 py-10">
      <Reveal>
        <span className="chip border-red-500/30 bg-red-500/10 text-red-200">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          {site.liveSectionTitle}
        </span>
        <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight">
          {live ? live.title : "Lives en directo"}
          {/* « con Dani » seulement si le titre ne le dit pas déjà */}
          {!/dani/i.test(live?.title ?? "") && (
            <>
              <br />
              <span className="text-brand-300">con Dani</span>
            </>
          )}
        </h2>
        {site.liveSectionText && <p className="mt-3 text-sm text-white/60">{site.liveSectionText}</p>}
      </Reveal>

      <Reveal delay={0.05}>
        <div className="glass relative mt-6 overflow-hidden rounded-3xl p-5 shadow-card">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-red-500/20 blur-3xl" />

          {/* Date / état du live */}
          {phase === "none" && (
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" />
              <p className="text-sm text-white/70">
                Aún no hay fecha para el próximo live. Inscríbete y te avisaremos por correo en cuanto
                Dani lo programe.
              </p>
            </div>
          )}

          {(phase === "scheduled" || phase === "countdown") && (
            <>
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/50">Fecha y hora (tu zona horaria)</p>
                  <p className="font-display text-lg font-bold">{formatLiveDate(live.scheduledAt)}</p>
                </div>
              </div>
              <Countdown remaining={remaining} />
            </>
          )}

          {(phase === "live" || phase === "ready") && (
            <div className="text-center">
              <p className="flex items-center justify-center gap-2 font-display text-xl font-extrabold">
                <Radio className="h-5 w-5 text-red-500" />
                {phase === "live" ? "¡Estamos en directo!" : "¡El live está por empezar!"}
              </p>
              <a href="/live" className="btn-primary mt-4 w-full bg-none !bg-red-500">
                <Play className="h-4 w-4 fill-white" /> Ver el live ahora
              </a>
            </div>
          )}

          {/* Formulaire d'inscription */}
          {phase !== "live" && (
            <div className="mt-5 border-t border-white/10 pt-5">
              <AnimatePresence mode="wait">
                {status === "done" || alreadyRegistered ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center"
                  >
                    <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                    <p className="mt-3 font-display text-lg font-bold">
                      ¡Listo{saved?.firstName ? `, ${saved.firstName}` : ""}! Estás inscrito/a.
                    </p>
                    <p className="mt-1 text-sm text-white/60">
                      Te enviaremos un recordatorio 3 horas y 5 minutos antes del live.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setStatus("idle");
                        setSaved(null);
                      }}
                      className="mt-4 text-xs font-semibold text-brand-200 underline underline-offset-4"
                    >
                      Inscribir a otra persona
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={submit}
                    className="flex flex-col gap-3"
                  >
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <BellRing className="h-4 w-4 text-gold-400" /> Reserva tu lugar gratis
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Nombre" value={form.firstName} onChange={update("firstName")} autoComplete="given-name" />
                      <Field label="Apellido" value={form.lastName} onChange={update("lastName")} autoComplete="family-name" />
                    </div>
                    <Field
                      label="Correo electrónico"
                      type="email"
                      value={form.email}
                      onChange={update("email")}
                      autoComplete="email"
                      inputMode="email"
                    />
                    {/* Champ piège anti-robots, invisible pour les humains */}
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.website}
                      onChange={update("website")}
                      className="hidden"
                      aria-hidden="true"
                    />
                    {status === "error" && (
                      <p role="alert" className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">
                        {error}
                      </p>
                    )}
                    <button type="submit" disabled={status === "sending"} className="btn-primary mt-1 w-full disabled:opacity-60">
                      {status === "sending" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <BellRing className="h-4 w-4" />
                      )}
                      Quiero inscribirme
                    </button>
                    <p className="text-center text-[11px] text-white/40">
                      Solo usaremos tu correo para avisarte de los lives. Puedes darte de baja cuando quieras.
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </Reveal>
    </section>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium text-white/60">
      {label}
      <input
        required
        maxLength={props.type === "email" ? 254 : 80}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-brand-400 focus:bg-white/10"
        {...props}
      />
    </label>
  );
}
