/**
 * Modèles d'emails (en espagnol, comme le site) : HTML + version texte.
 */
import { config } from "../config.js";

/** Échappe le HTML pour les valeurs saisies par l'utilisateur. */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** « jueves, 23 de octubre de 2026, 19:00 (hora de Nueva York) » */
export function formatLiveDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const formatted = new Intl.DateTimeFormat("es", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: config.timezone,
  }).format(date);
  const zone = new Intl.DateTimeFormat("es", {
    timeZone: config.timezone,
    timeZoneName: "long",
  })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;
  return zone ? `${formatted} (${zone})` : formatted;
}

/** « jueves, 23 de octubre » (pour les sujets d'emails) */
function formatShortDate(iso) {
  return new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: config.timezone,
  }).format(new Date(iso));
}

/** « 2 h 15 min », « 5 min » */
function formatRemaining(ms) {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function liveUrl() {
  return `${config.publicUrl}/live`;
}

export function unsubscribeUrl(token) {
  return `${config.publicUrl}/api/public/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** Gabarit HTML commun (styles en ligne pour la compatibilité des clients mail). */
function layout({ preheader, bodyHtml, ctaLabel, ctaUrl, unsubscribeToken }) {
  const cta = ctaUrl
    ? `<p style="margin:28px 0 8px;text-align:center">
         <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#1f3ad6;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:14px">${escapeHtml(ctaLabel)}</a>
       </p>`
    : "";
  const unsubscribe = unsubscribeToken
    ? `<p style="margin:0">¿No quieres recibir más avisos? <a href="${escapeHtml(unsubscribeUrl(unsubscribeToken))}" style="color:#8eacff">Darme de baja</a></p>`
    : "";
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#0b1220;font-family:Helvetica,Arial,sans-serif;color:#e5e9f5">
  <span style="display:none;opacity:0;height:0;overflow:hidden">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b1220;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#121b33;border-radius:20px;border:1px solid #24304f">
        <tr><td style="padding:28px 28px 0">
          <p style="margin:0;font-size:18px;font-weight:800;color:#ffffff">Dani<span style="color:#8eacff">Inmigración</span>
            <span style="display:inline-block;margin-left:8px;background:#ff2d55;color:#fff;font-size:11px;font-weight:800;padding:3px 8px;border-radius:999px;vertical-align:middle">LIVE</span></p>
        </td></tr>
        <tr><td style="padding:20px 28px 28px;font-size:15px;line-height:1.6;color:#d6dcef">
          ${bodyHtml}
          ${cta}
        </td></tr>
      </table>
      <table role="presentation" width="100%" style="max-width:520px">
        <tr><td style="padding:16px 8px;font-size:12px;line-height:1.5;color:#7c88a8;text-align:center">
          ${unsubscribe}
          <p style="margin:6px 0 0">© Dani Inmigración</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function textFooter(unsubscribeToken) {
  return unsubscribeToken ? `\n\n—\nDarse de baja: ${unsubscribeUrl(unsubscribeToken)}` : "";
}

/** Confirmation immédiate après l'inscription. */
export function confirmationEmail(registration, live) {
  const name = registration.first_name;
  const when = live?.scheduled_at ? formatLiveDate(live.scheduled_at) : null;
  const subject = when
    ? `¡Inscripción confirmada! Live con Dani el ${formatShortDate(live.scheduled_at)}`
    : "¡Inscripción confirmada! Te avisaremos del próximo live";
  const intro = when
    ? `Tu lugar para el live <strong>«${escapeHtml(live.title)}»</strong> está reservado.<br>📅 <strong>${escapeHtml(when)}</strong>`
    : "Todavía no hay fecha para el próximo live: te escribiremos en cuanto Dani lo programe.";
  const html = layout({
    preheader: "Tu inscripción al live de Dani Inmigración",
    bodyHtml: `<h1 style="margin:0 0 12px;font-size:22px;color:#fff">¡Hola ${escapeHtml(name)}! 🎉</h1>
      <p style="margin:0 0 12px">${intro}</p>
      <p style="margin:0">Te enviaremos un recordatorio <strong>3 horas</strong> y otro <strong>5 minutos</strong> antes de empezar.</p>`,
    ctaLabel: when ? "Ver la página del live" : null,
    ctaUrl: when ? liveUrl() : null,
    unsubscribeToken: registration.unsubscribe_token,
  });
  const text = `¡Hola ${name}!\n\n${
    when
      ? `Tu lugar para el live «${live.title}» está reservado: ${when}.\nEnlace: ${liveUrl()}`
      : "Te avisaremos en cuanto Dani programe el próximo live."
  }\n\nTe enviaremos un recordatorio 3 horas y 5 minutos antes.${textFooter(registration.unsubscribe_token)}`;
  return { subject, html, text, unsubscribeUrl: unsubscribeUrl(registration.unsubscribe_token) };
}

/** Rappel automatique (3 h ou 5 min avant). */
export function reminderEmail(registration, live, kind, msBefore) {
  const name = registration.first_name;
  const soon = kind === "reminder_5m";
  const remaining = formatRemaining(msBefore);
  const subject = soon
    ? `🔴 ¡El live empieza en ${remaining}!`
    : `⏰ Recordatorio: el live con Dani empieza en ${remaining}`;
  const html = layout({
    preheader: soon ? "Entra ya, estamos a punto de empezar" : `Live: ${live.title}`,
    bodyHtml: `<h1 style="margin:0 0 12px;font-size:22px;color:#fff">${soon ? "¡Ya casi empezamos" : "¡Hoy hay live"}, ${escapeHtml(name)}!</h1>
      <p style="margin:0 0 12px"><strong>«${escapeHtml(live.title)}»</strong> empieza en <strong>${escapeHtml(remaining)}</strong>.</p>
      <p style="margin:0">📅 ${escapeHtml(formatLiveDate(live.scheduled_at))}</p>`,
    ctaLabel: soon ? "Entrar al live" : "Abrir la página del live",
    ctaUrl: liveUrl(),
    unsubscribeToken: registration.unsubscribe_token,
  });
  const text = `Hola ${name}:\n\nEl live «${live.title}» empieza en ${remaining} (${formatLiveDate(
    live.scheduled_at
  )}).\nEntra aquí: ${liveUrl()}${textFooter(registration.unsubscribe_token)}`;
  return { subject, html, text, unsubscribeUrl: unsubscribeUrl(registration.unsubscribe_token) };
}

/** Email manuel envoyé depuis le cockpit. `message` est du texte brut. */
export function manualEmail(registration, { subject, message }) {
  const personalized = message.replace(/\{nombre\}/gi, registration.first_name);
  const paragraphs = personalized
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const html = layout({
    preheader: subject,
    bodyHtml: paragraphs,
    ctaLabel: "Ir a la página del live",
    ctaUrl: liveUrl(),
    unsubscribeToken: registration.unsubscribe_token,
  });
  const text = `${personalized}\n\n${liveUrl()}${textFooter(registration.unsubscribe_token)}`;
  return { subject, html, text, unsubscribeUrl: unsubscribeUrl(registration.unsubscribe_token) };
}

/** Lien de réinscription pour une adresse désinscrite (c'est la personne qui confirme). */
export function resubscribeEmail(registration) {
  const url = `${config.publicUrl}/api/public/resubscribe?token=${encodeURIComponent(registration.unsubscribe_token)}`;
  const subject = "Confirma que quieres volver a recibir los avisos de los lives";
  const html = layout({
    preheader: subject,
    bodyHtml: `<h1 style="margin:0 0 12px;font-size:22px;color:#fff">Hola ${escapeHtml(registration.first_name)}:</h1>
      <p style="margin:0 0 12px">Recibimos una solicitud para volver a inscribir este correo a los lives de Dani Inmigración.</p>
      <p style="margin:0">Si fuiste tú, confírmalo con el botón. Si no, ignora este mensaje: no recibirás nada más.</p>`,
    ctaLabel: "Sí, quiero volver a recibir avisos",
    ctaUrl: url,
  });
  const text = `Hola ${registration.first_name}:\n\nPara volver a recibir los avisos de los lives, confirma aquí: ${url}\n\nSi no fuiste tú, ignora este mensaje.`;
  return { subject, html, text };
}

/** Email de test (configuration SMTP). */
export function testEmail() {
  const subject = "Prueba de envío · Cockpit Dani Inmigración";
  const html = layout({
    preheader: subject,
    bodyHtml: `<h1 style="margin:0 0 12px;font-size:22px;color:#fff">¡Funciona! ✅</h1>
      <p style="margin:0">La configuración de correo del cockpit está lista (modo <strong>${config.mail.mode}</strong>).</p>`,
  });
  return { subject, html, text: `¡Funciona! Modo de correo: ${config.mail.mode}.` };
}
