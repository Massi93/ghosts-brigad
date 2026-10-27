/**
 * Petits composants d'interface partagés par les sections du cockpit.
 */
import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export function Card({ className = "", children, ...props }) {
  return (
    <div className={`rounded-3xl border border-white/10 bg-white/[0.04] p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function SectionTitle({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const VARIANTS = {
  primary: "bg-brand-500 text-white hover:bg-brand-400",
  danger: "bg-red-500 text-white hover:bg-red-400",
  ghost: "border border-white/15 bg-white/5 text-white hover:bg-white/10",
  subtle: "text-white/70 hover:bg-white/5 hover:text-white",
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
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Badge({ tone = "neutral", children, className = "", ...props }) {
  const tones = {
    neutral: "bg-white/10 text-white/70",
    live: "bg-red-500 text-white",
    success: "bg-emerald-400/15 text-emerald-300",
    warning: "bg-amber-400/15 text-amber-300",
    danger: "bg-red-500/15 text-red-300",
    info: "bg-brand-400/15 text-brand-200",
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

export function Stat({ icon: Icon, label, value, hint, tone = "text-brand-200" }) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-white/50">
        {Icon && <Icon className={`h-4 w-4 ${tone}`} />}
        {label}
      </div>
      <p className="font-display text-2xl font-extrabold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-white/40">{hint}</p>}
    </Card>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium text-white/60">
      {label}
      {children}
      {hint && <span className="text-[11px] font-normal text-white/40">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-brand-400 focus:bg-white/10 disabled:opacity-50 [color-scheme:dark]";

export function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      {Icon && <Icon className="h-8 w-8 text-white/25" />}
      <p className="font-semibold text-white/70">{title}</p>
      {text && <p className="max-w-sm text-sm text-white/40">{text}</p>}
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
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              role="status"
              className="pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl border border-white/10 bg-[#121b33] px-4 py-3 text-sm shadow-card"
            >
              {t.type === "error" ? (
                <XCircle className="h-4 w-4 shrink-0 text-red-400" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
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
