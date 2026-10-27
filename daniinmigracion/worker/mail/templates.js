/**
 * Modèles d'emails (HTML + version texte), aux couleurs du site
 * (rouge #c60b1e, or #f1bf00), dans la langue de l'inscrit (es, fr, ar).
 */
import { config } from "../config.js";
import { T, formatRemaining, intlLocale, normalizeLang } from "./i18n.js";

/** Échappe le HTML pour les valeurs saisies par l'utilisateur. */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** « jueves, 23 de octubre de 2026, 19:00 (hora de verano de Europa central) » */
export function formatLiveDate(iso, lang = "es") {
  if (!iso) return "";
  const date = new Date(iso);
  const locale = intlLocale(lang);
  const formatted = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: config.timezone,
  }).format(date);
  const zone = new Intl.DateTimeFormat(locale, { timeZone: config.timezone, timeZoneName: "long" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;
  return zone ? `${formatted} (${zone})` : formatted;
}

/** « jueves, 23 de octubre » (pour les sujets d'emails) */
function formatShortDate(iso, lang) {
  return new Intl.DateTimeFormat(intlLocale(lang), {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: config.timezone,
  }).format(new Date(iso));
}

/** Page du live, dans la langue de l'inscrit (la page /live lit `?lang=`). */
function liveUrl(lang = "es") {
  return `${config.publicUrl}/live?lang=${lang}`;
}

export function unsubscribeUrl(token) {
  return `${config.publicUrl}/api/live/public/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** Gabarit HTML commun (styles en ligne pour la compatibilité des clients mail). */
function layout({ lang, preheader, bodyHtml, ctaLabel, ctaUrl, unsubscribeToken }) {
  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const align = lang === "ar" ? "right" : "left";
  const cta = ctaUrl
    ? `<p style="margin:28px 0 8px;text-align:center">
         <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#c60b1e;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 30px;border-radius:50px;letter-spacing:.3px">${escapeHtml(ctaLabel)}</a>
       </p>`
    : "";
  const unsubscribe = unsubscribeToken
    ? `<p style="margin:0">${escapeHtml(t.footerQuestion)} <a href="${escapeHtml(unsubscribeUrl(unsubscribeToken))}" style="color:#c60b1e">${escapeHtml(t.footerLink)}</a></p>`
    : "";
  return `<!doctype html>
<html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f6f8fb;font-family:Inter,Helvetica,Arial,sans-serif;color:#52525b" dir="${dir}">
  <span style="display:none;opacity:0;height:0;overflow:hidden">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fb;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;border:1px solid #e9ecf2;overflow:hidden">
        <tr><td style="height:4px;background:#c60b1e;background:linear-gradient(90deg,#c60b1e,#f1bf00)"></td></tr>
        <tr><td style="padding:26px 28px 0;text-align:${align}">
          <p style="margin:0;font-size:18px;font-weight:800;color:#0f1020">Dani Inmigración
            <span style="display:inline-block;margin:0 6px;background:#c60b1e;color:#fff;font-size:11px;font-weight:800;padding:3px 8px;border-radius:999px;vertical-align:middle">LIVE</span></p>
        </td></tr>
        <tr><td style="padding:18px 28px 28px;font-size:15px;line-height:1.65;color:#52525b;text-align:${align}">
          ${bodyHtml}
          ${cta}
        </td></tr>
      </table>
      <table role="presentation" width="100%" style="max-width:520px">
        <tr><td style="padding:16px 8px;font-size:12px;line-height:1.5;color:#8a8a99;text-align:center">
          ${unsubscribe}
          <p style="margin:6px 0 0">© Dani Inmigración</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const h1 = (text) => `<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#0f1020">${text}</h1>`;
const p = (html, last = false) => `<p style="margin:0 0 ${last ? 0 : 12}px">${html}</p>`;

function textFooter(lang, unsubscribeToken) {
  return unsubscribeToken ? `\n\n—\n${T[lang].footerText}: ${unsubscribeUrl(unsubscribeToken)}` : "";
}

/** Confirmation immédiate après l'inscription. */
export function confirmationEmail(registration, live) {
  const lang = normalizeLang(registration.lang);
  const t = T[lang];
  const name = registration.first_name;
  const when = live?.scheduled_at ? formatLiveDate(live.scheduled_at, lang) : null;
  const subject = when ? t.confirmSubjectDate(formatShortDate(live.scheduled_at, lang)) : t.confirmSubjectNoDate;
  const intro = when ? t.confirmReserved(escapeHtml(live.title), escapeHtml(when)) : t.confirmNoDate;
  const html = layout({
    lang,
    preheader: t.confirmPreheader,
    bodyHtml: `${h1(escapeHtml(t.hello(name)) + " 🎉")}${p(intro)}${p(t.confirmReminders, true)}`,
    ctaLabel: when ? t.seeLivePage : null,
    ctaUrl: when ? liveUrl(lang) : null,
    unsubscribeToken: registration.unsubscribe_token,
  });
  const text = `${t.hello(name)}\n\n${
    when ? `${t.confirmReservedText(live.title, when)}\n${t.link}: ${liveUrl(lang)}` : t.confirmNoDate
  }\n\n${t.confirmRemindersText}${textFooter(lang, registration.unsubscribe_token)}`;
  return { subject, html, text, unsubscribeUrl: unsubscribeUrl(registration.unsubscribe_token) };
}

/** Rappel automatique (3 h ou 5 min avant). */
export function reminderEmail(registration, live, kind, msBefore) {
  const lang = normalizeLang(registration.lang);
  const t = T[lang];
  const name = registration.first_name;
  const soon = kind === "reminder_5m";
  const remaining = formatRemaining(msBefore, lang);
  const when = formatLiveDate(live.scheduled_at, lang);
  if (live.status === "live") {
    // Dani a lancé le live avant l'heure prévue.
    return {
      subject: t.liveNowSubject,
      html: layout({
        lang,
        preheader: t.liveNowPreheader,
        bodyHtml: `${h1(escapeHtml(t.liveNowHeading(name)))}${p(t.liveNowBody(escapeHtml(live.title)), true)}`,
        ctaLabel: t.enterLive,
        ctaUrl: liveUrl(lang),
        unsubscribeToken: registration.unsubscribe_token,
      }),
      text: `${t.liveNowText(name, live.title, liveUrl(lang))}${textFooter(lang, registration.unsubscribe_token)}`,
      unsubscribeUrl: unsubscribeUrl(registration.unsubscribe_token),
    };
  }
  const subject = soon ? t.reminderSubject5m(remaining) : t.reminderSubject3h(remaining);
  const html = layout({
    lang,
    preheader: soon ? t.reminderPreheader5m : `Live: ${live.title}`,
    bodyHtml: `${h1(escapeHtml(soon ? t.reminderHeading5m(name) : t.reminderHeading3h(name)))}${p(
      t.reminderBody(escapeHtml(live.title), escapeHtml(remaining))
    )}${p(`📅 ${escapeHtml(when)}`, true)}`,
    ctaLabel: soon ? t.enterLive : t.openLivePage,
    ctaUrl: liveUrl(lang),
    unsubscribeToken: registration.unsubscribe_token,
  });
  const text = `${t.reminderText(name, live.title, remaining, when, liveUrl(lang))}${textFooter(lang, registration.unsubscribe_token)}`;
  return { subject, html, text, unsubscribeUrl: unsubscribeUrl(registration.unsubscribe_token) };
}

/** Email manuel envoyé depuis le cockpit. `message` est du texte brut (écrit par Dani). */
export function manualEmail(registration, { subject, message }) {
  const lang = normalizeLang(registration.lang);
  // {nombre} (ou {prenom} / {prénom}) = prénom de l'inscrit, dans le message et l'objet.
  // (fonction de remplacement : un « $ » dans le prénom reste un simple caractère)
  const fill = (text) => text.replace(/\{(nombre|pr[ée]nom)\}/gi, () => registration.first_name);
  const personalized = fill(message);
  subject = fill(subject);
  const paragraphs = personalized
    .split(/\n{2,}/)
    .map((para) => p(escapeHtml(para).replace(/\n/g, "<br>")))
    .join("");
  const html = layout({
    lang,
    preheader: subject,
    bodyHtml: paragraphs,
    ctaLabel: T[lang].goLivePage,
    ctaUrl: liveUrl(lang),
    unsubscribeToken: registration.unsubscribe_token,
  });
  const text = `${personalized}\n\n${liveUrl(lang)}${textFooter(lang, registration.unsubscribe_token)}`;
  return { subject, html, text, unsubscribeUrl: unsubscribeUrl(registration.unsubscribe_token) };
}

/** Lien de réinscription pour une adresse désinscrite (c'est la personne qui confirme). */
export function resubscribeEmail(registration) {
  const lang = normalizeLang(registration.lang);
  const t = T[lang];
  const url = `${config.publicUrl}/api/live/public/resubscribe?token=${encodeURIComponent(registration.unsubscribe_token)}`;
  const html = layout({
    lang,
    preheader: t.resubscribeSubject,
    bodyHtml: `${h1(escapeHtml(t.resubscribeHeading(registration.first_name)))}${p(t.resubscribeBody, true)}`,
    ctaLabel: t.resubscribeCta,
    ctaUrl: url,
  });
  return { subject: t.resubscribeSubject, html, text: t.resubscribeText(registration.first_name, url) };
}

/** Email de test (configuration de l'envoi), dans la langue du cockpit. */
export function testEmail(lang = "es") {
  const fr = lang === "fr";
  const subject = fr ? "Test d'envoi · Cockpit Dani Inmigración" : "Prueba de envío · Cockpit Dani Inmigración";
  const mode = escapeHtml(config.mail.mode);
  const html = layout({
    lang: fr ? "fr" : "es",
    preheader: subject,
    bodyHtml: `${h1(fr ? "Ça marche ! ✅" : "¡Funciona! ✅")}${p(
      fr
        ? `La configuration des e-mails du cockpit est prête (mode <strong>${mode}</strong>).`
        : `La configuración de correo del cockpit está lista (modo <strong>${mode}</strong>).`,
      true
    )}`,
  });
  const text = fr ? `Ça marche ! Mode d'envoi : ${config.mail.mode}.` : `¡Funciona! Modo de correo: ${config.mail.mode}.`;
  return { subject, html, text };
}

/** Petite page HTML autonome (désinscription / réinscription), aux couleurs du site. */
export function standalonePage(lang, bodyHtml) {
  const t = T[normalizeLang(lang)];
  const dir = lang === "ar" ? "rtl" : "ltr";
  return `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(t.pageTitle)}</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f8fb;color:#52525b;font-family:Inter,system-ui,sans-serif;padding:24px;box-sizing:border-box">
<main style="max-width:440px;width:100%;background:#fff;border:1px solid #e9ecf2;border-radius:22px;padding:32px 28px;text-align:center;box-shadow:0 24px 64px rgba(15,16,32,.08)">
<p style="margin:0 0 18px;font-size:20px;font-weight:800;color:#0f1020">Dani Inmigración <span style="background:#c60b1e;color:#fff;font-size:11px;padding:3px 8px;border-radius:999px;vertical-align:middle">LIVE</span></p>
${bodyHtml}<p style="margin-top:24px"><a href="/" style="color:#c60b1e;font-weight:600">${escapeHtml(t.backToSite)}</a></p></main></body></html>`;
}

/** Formulaire de confirmation : l'action n'est faite qu'au clic (POST). */
export function confirmForm(question, button) {
  return `<p style="font-size:16px;line-height:1.6">${question}</p>
<form method="post"><button type="submit" style="margin-top:8px;padding:13px 26px;border:0;border-radius:50px;background:#c60b1e;color:#fff;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit">${button}</button></form>`;
}
