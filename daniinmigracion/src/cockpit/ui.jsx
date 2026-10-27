/**
 * Petits composants d'interface partagés par les sections du cockpit.
 */
import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export function Card({ className = "", children, ...props }) {
  return (
    <div className={`rounded-[22px] border border-site-line bg-white p-5 shadow-site-card ${className}`} {...props}>
      {children}
    </div>
  );
}

export function SectionTitle({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-site-red">Cockpit · Live</p>
        <h1 className="mt-1 font-display text-2xl font-black tracking-tight text-site-ink sm:text-3xl">{title}</h1>
        <div className="site-line-accent mt-2 h-[3px] w-12 rounded-full" />
        {subtitle && <p className="mt-2 text-sm text-site-text">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const VARIANTS = {
  // Boutons « pilule » comme sur le site (rouge du drapeau, ombre rouge).
  primary: "bg-gradient-to-br from-site-red to-site-red-d text-white shadow-site-red hover:-translate-y-px hover:shadow-[0_10px_24px_-4px_rgba(198,11,30,0.42)]",
  danger: "bg-gradient-to-br from-site-red to-site-red-d text-white shadow-site-red hover:-translate-y-px hover:shadow-[0_10px_24px_-4px_rgba(198,11,30,0.42)]",
  ghost: "border border-site-line bg-white text-site-ink hover:border-site-teal hover:text-site-teal-d",
  subtle: "text-site-text hover:bg-site-bg hover:text-site-ink",
};

export function Button({
  variant = "primary",
  loading = false,
  disabled = false,
  icon: Icon,
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={loading || disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${VARIANTS[variant]} ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Badge({ tone = "neutral", children, className = "", ...props }) {
  const tones = {
    neutral: "bg-site-bg text-site-text ring-1 ring-inset ring-site-line",
    live: "bg-site-red text-white",
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
    danger: "bg-site-red-l text-site-red-d ring-1 ring-inset ring-red-200",
    info: "bg-[#e6f7f7] text-site-teal-d ring-1 ring-inset ring-[#b3e8e8]",
    overlay: "bg-black/70 text-white", // sur la vidéo
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

/** Mode d'envoi des emails (console = test, rien n'est envoyé). */
export function MailModeBadge({ mail }) {
  if (!mail) return null;
  if (mail.mode === "console") return <Badge tone="warning">Consola (prueba, no se envía nada)</Badge>;
  const label = { smtp: "SMTP", brevo: "Brevo", resend: "Resend" }[mail.mode] ?? mail.mode;
  return (
    <Badge tone="success">
      {label}
      {mail.mode === "smtp" && mail.host ? ` · ${mail.host}` : ""}
    </Badge>
  );
}

export function Stat({ icon: Icon, label, value, hint, tone = "text-site-red" }) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-site-gray">
        {Icon && <Icon className={`h-4 w-4 ${tone}`} />}
        {label}
      </div>
      <p className="font-display text-2xl font-black tabular-nums text-site-ink">{value}</p>
      {hint && <p className="text-xs text-site-gray">{hint}</p>}
    </Card>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-site-ink">
      {label}
      {children}
      {hint && <span className="text-[11px] font-normal normal-case tracking-normal text-site-gray">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-[11px] border-[1.5px] border-site-line bg-site-soft px-3.5 py-2.5 text-sm font-normal normal-case tracking-normal text-site-ink placeholder-site-gray/70 outline-none transition focus:border-site-teal focus:bg-white focus:ring-4 focus:ring-[rgba(0,180,180,0.1)] disabled:opacity-50";

export function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      {Icon && <Icon className="h-8 w-8 text-site-gray/60" />}
      <p className="font-semibold text-site-ink">{title}</p>
      {text && <p className="max-w-sm text-sm text-site-gray">{text}</p>}
    </div>
  );
}

/** Drapeau emoji à partir du code pays ISO (« MX » → 🇲🇽). */
export function flag(countryCode) {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  return String.fromCodePoint(...[...countryCode.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

/* ------------------------------ Notifications ------------------------------ */

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, type = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="cockpit-theme pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              role="status"
              className="pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl border border-site-line bg-white px-4 py-3 text-sm font-medium text-site-ink shadow-[0_18px_50px_-12px_rgba(15,16,32,0.3)]"
            >
              {t.type === "error" ? (
                <XCircle className="h-4 w-4 shrink-0 text-site-red" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              )}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/** `toast(message, "success" | "error")` */
export function useToast() {
  return useContext(ToastContext);
}
