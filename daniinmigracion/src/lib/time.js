/**
 * Formatage des dates / durées (en espagnol) et horloge React.
 */
import { useEffect, useState } from "react";

const pad = (n) => String(n).padStart(2, "0");

/** Durée « mm:ss » ou « h:mm:ss ». */
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Compte à rebours « mm:ss » arrondi à la seconde supérieure (05:00 → 00:00). */
export function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Décompose une durée en jours / heures / minutes / secondes. */
export function splitDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** « jueves, 23 de octubre · 19:00 » dans le fuseau du visiteur (`locale` : es par défaut). */
export function formatLiveDate(iso, locale = "es") {
  if (!iso) return "";
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(date);
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date);
  // Majuscule uniquement sur la première lettre (« Lunes, 19 de octubre »).
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time}`;
}

/** Date + heure courte : « 19/10/2026 18:42 ». */
export function formatDateTime(iso, locale = "es") {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

/** Taille lisible : « 12,4 MB ». */
export function formatBytes(bytes, locale = "es") {
  if (!bytes) return "0 B";
  const units = locale === "fr" ? ["o", "Ko", "Mo", "Go"] : ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toLocaleString(locale, { maximumFractionDigits: 1 })} ${units[i]}`;
}

/**
 * Heure courante rafraîchie toutes les `intervalMs` (désactivée si `enabled` = false).
 * `offset` corrige le décalage entre l'horloge du navigateur et celle du serveur.
 */
export function useNow(intervalMs = 1000, { enabled = true, offset = 0 } = {}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
  return now + offset;
}
