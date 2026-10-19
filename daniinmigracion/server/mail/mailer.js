/**
 * Envoi des emails.
 *
 * - MAIL_MODE=console (défaut) : aucun email réel n'est envoyé. Chaque message est
 *   résumé dans le terminal et sauvegardé en `.eml` (ouvrable avec Thunderbird,
 *   Outlook, Apple Mail…) dans storage/mails/.
 * - MAIL_MODE=smtp : envoi réel via SMTP (Mailtrap pour tester, puis Brevo, OVH, Gmail…).
 *
 * Tous les envois passent par une file unique pour respecter MAIL_RATE_PER_SECOND.
 */
import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import { config } from "../config.js";

let transport;

function createTransport() {
  if (config.mail.mode === "smtp") {
    const { host, port, secure, user, pass } = config.mail.smtp;
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
      pool: true,
      maxConnections: 2,
    });
  }
  // Mode console : nodemailer génère le message complet sans l'envoyer.
  return nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
}

/** Initialise le transport et vérifie la connexion SMTP (sans bloquer le démarrage). */
export function initMailer() {
  transport = createTransport();
  if (config.mail.mode === "smtp") {
    if (!config.mail.smtp.host) {
      console.warn("[mail] MAIL_MODE=smtp mais SMTP_HOST est vide : les envois échoueront.");
      return;
    }
    transport
      .verify()
      .then(() => console.log(`[mail] SMTP prêt (${config.mail.smtp.host}:${config.mail.smtp.port}).`))
      .catch((err) => console.warn(`[mail] Connexion SMTP impossible : ${err.message}`));
  } else {
    console.log(`[mail] Mode console : les emails sont enregistrés dans ${config.paths.mails}`);
  }
}

/* ----------------------------- File d'envoi ----------------------------- */

const queue = [];
let running = false;

async function runQueue() {
  if (running) return;
  running = true;
  const delay = Math.ceil(1000 / config.mail.ratePerSecond);
  while (queue.length) {
    const job = queue.shift();
    try {
      job.resolve(await deliver(job.message));
    } catch (err) {
      job.reject(err);
    }
    if (queue.length) await new Promise((r) => setTimeout(r, delay));
  }
  running = false;
}

/**
 * Ajoute un email à la file et attend son envoi.
 * @param {{ to: string, subject: string, html: string, text: string }} message
 */
export function sendMail(message) {
  return new Promise((resolve, reject) => {
    queue.push({ message, resolve, reject });
    runQueue();
  });
}

async function deliver({ to, subject, html, text }) {
  if (!transport) transport = createTransport();
  const info = await transport.sendMail({ from: config.mail.from, to, subject, html, text });

  if (config.mail.mode === "console") {
    fs.mkdirSync(config.paths.mails, { recursive: true });
    const safeTo = to.replace(/[^a-z0-9@._-]/gi, "_");
    const file = path.join(
      config.paths.mails,
      `${new Date().toISOString().replace(/[:.]/g, "-")}-${safeTo}.eml`
    );
    fs.writeFileSync(file, info.message);
    console.log(`[mail] ✉️  (console) À : ${to} | Sujet : ${subject} → ${path.basename(file)}`);
  }
  return { messageId: info.messageId };
}
