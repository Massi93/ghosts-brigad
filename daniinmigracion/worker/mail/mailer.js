/**
 * Envoi des emails.
 *
 * - MAIL_MODE=console (défaut) : aucun email réel n'est envoyé. Chaque message est
 *   affiché dans les logs (`npx wrangler tail`) et copié dans la base : le cockpit
 *   affiche les derniers emails « envoyés » (Ajustes → Correos de prueba).
 * - MAIL_MODE=smtp : envoi réel via SMTP (Brevo, Gmail, OVH, Mailtrap…).
 * - MAIL_MODE=brevo / resend : envoi réel via l'API HTTP du fournisseur (MAIL_API_KEY).
 *
 * Tous les envois passent par une file unique pour respecter MAIL_RATE_PER_SECOND.
 */
import { config, parseAddress } from "../config.js";
import { db } from "../db.js";

const OUTBOX_KEEP = 200; // emails conservés en mode console

/** Décrit la configuration (cockpit, logs). */
export function describeMailer() {
  const { mode, smtp } = config.mail;
  return {
    mode,
    from: config.mail.from,
    host: mode === "smtp" ? smtp.host || null : mode === "console" ? null : mode,
  };
}

/** Vérifie la configuration au démarrage (sans bloquer). */
export function initMailer() {
  const { mode, smtp, apiKey } = config.mail;
  if (mode === "smtp" && !smtp.host) console.warn("[mail] MAIL_MODE=smtp mais SMTP_HOST est vide : les envois échoueront.");
  if ((mode === "brevo" || mode === "resend") && !apiKey) {
    console.warn(`[mail] MAIL_MODE=${mode} mais MAIL_API_KEY est vide : les envois échoueront.`);
  }
}

/* ----------------------------- File d'envoi ----------------------------- */

const queue = [];
let running = false;
let lastSentAt = 0;

async function runQueue() {
  if (running) return;
  running = true;
  // Débit max du fournisseur (MAIL_RATE_PER_SECOND), compté depuis le dernier envoi :
  // les rappels et les envois manuels arrivent un par un, la file reste souvent vide.
  const delay = config.mail.mode === "console" ? 0 : Math.ceil(1000 / config.mail.ratePerSecond);
  try {
    while (queue.length) {
      const wait = lastSentAt + delay - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      const job = queue.shift();
      lastSentAt = Date.now();
      try {
        job.resolve(await deliver(job.message));
      } catch (err) {
        job.reject(err);
      }
    }
  } finally {
    running = false;
  }
}

/** Nombre d'emails en attente dans la file. */
export function pendingMailCount() {
  return queue.length + (running ? 1 : 0);
}

/**
 * Ajoute un email à la file et attend son envoi.
 * @param {{ to: string, subject: string, html: string, text: string, unsubscribeUrl?: string }} message
 * @param {{ priority?: boolean }} [options] `priority` : passe devant (rappels automatiques,
 *   qui ne doivent pas attendre la fin d'un gros envoi manuel)
 */
export function sendMail(message, { priority = false } = {}) {
  return new Promise((resolve, reject) => {
    const job = { message, resolve, reject };
    if (priority) queue.unshift(job);
    else queue.push(job);
    runQueue();
  });
}

/** En-têtes de désinscription en un clic (bouton natif de Gmail / Outlook, RFC 8058). */
function unsubscribeHeaders(unsubscribeUrl) {
  return unsubscribeUrl
    ? { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
    : {};
}

async function deliver(message) {
  switch (config.mail.mode) {
    case "smtp":
      return deliverSmtp(message);
    case "brevo":
      return deliverBrevo(message);
    case "resend":
      return deliverResend(message);
    default:
      return deliverConsole(message);
  }
}

/** Mode console : rien n'est envoyé, l'email est gardé pour le consulter. */
function deliverConsole({ to, subject, html, text }) {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO mail_outbox (to_email, subject, html, text) VALUES (?, ?, ?, ?)")
    .run(to, subject, html, text);
  db.prepare("DELETE FROM mail_outbox WHERE id <= ?").run(Number(lastInsertRowid) - OUTBOX_KEEP);
  console.log(`[mail] ✉️  (console) À : ${to} | Sujet : ${subject}`);
  return { messageId: `console-${lastInsertRowid}` };
}

/** SMTP via les sockets TCP de Cloudflare (bibliothèque worker-mailer). */
async function deliverSmtp({ to, subject, html, text, unsubscribeUrl }) {
  const { host, port, secure, user, pass } = config.mail.smtp;
  if (!host) throw new Error("SMTP_HOST no configurado");
  const { WorkerMailer } = await import("worker-mailer");
  const mailer = await WorkerMailer.connect({
    host,
    port,
    secure,
    startTls: !secure,
    credentials: user ? { username: user, password: pass } : undefined,
    authType: ["plain", "login"],
    socketTimeoutMs: 15_000,
    responseTimeoutMs: 15_000,
  });
  try {
    await mailer.send({
      from: parseAddress(config.mail.from),
      to: { email: to },
      subject,
      html,
      text,
      headers: unsubscribeHeaders(unsubscribeUrl),
    });
  } finally {
    await mailer.close().catch(() => {});
  }
  return { messageId: null };
}

async function postJson(url, headers, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error?.message || data.name || `HTTP ${response.status}`);
  }
  return data;
}

/** API Brevo (ex-Sendinblue) : https://developers.brevo.com/reference/sendtransacemail */
async function deliverBrevo({ to, subject, html, text, unsubscribeUrl }) {
  const from = parseAddress(config.mail.from);
  const data = await postJson(
    "https://api.brevo.com/v3/smtp/email",
    { "api-key": config.mail.apiKey },
    {
      sender: { name: from.name || undefined, email: from.email },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
      headers: unsubscribeHeaders(unsubscribeUrl),
    }
  );
  return { messageId: data.messageId ?? null };
}

/** API Resend : https://resend.com/docs/api-reference/emails/send-email */
async function deliverResend({ to, subject, html, text, unsubscribeUrl }) {
  const data = await postJson(
    "https://api.resend.com/emails",
    { Authorization: `Bearer ${config.mail.apiKey}` },
    { from: config.mail.from, to: [to], subject, html, text, headers: unsubscribeHeaders(unsubscribeUrl) }
  );
  return { messageId: data.id ?? null };
}

/** Derniers emails du mode console (cockpit). */
export function listOutbox(limit = 30) {
  return db
    .prepare("SELECT id, to_email AS toEmail, subject, created_at AS createdAt FROM mail_outbox ORDER BY id DESC LIMIT ?")
    .all(limit);
}

export function getOutboxMail(id) {
  return db.prepare("SELECT * FROM mail_outbox WHERE id = ?").get(id) ?? null;
}
