/**
 * Inscrits au live : enregistrement, liste, export CSV, désinscription.
 */
import { config } from "../config.js";
import { db, nowIso } from "../db.js";
import { randomToken } from "../lib/crypto.js";

function toDto(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    lang: row.lang,
    liveId: row.live_id,
    liveTitle: row.live_title ?? null,
    createdAt: row.created_at,
    unsubscribedAt: row.unsubscribed_at,
    lastEmail: row.last_email_status
      ? {
          kind: row.last_email_kind,
          status: row.last_email_status,
          at: row.last_email_sent_at || row.last_email_created_at,
          error: row.last_email_error,
        }
      : null,
  };
}

/**
 * Inscrit une personne. Une même adresse ne crée qu'une seule ligne.
 *
 * Le formulaire public ne peut PAS modifier une inscription existante (nom, statut) :
 * n'importe qui pourrait sinon saisir l'email d'un tiers. Une personne désinscrite
 * reçoit un email avec un lien pour confirmer elle-même sa réinscription.
 *
 * @returns {{ registration: object, action: "confirm" | "resubscribe" | "none" }}
 *   confirm     : nouvelle inscription, ou inscrit existant visant un nouveau live
 *   resubscribe : adresse désinscrite → envoyer le lien de réinscription
 */
export function upsertRegistration({ firstName, lastName, email, lang = "es", liveId }) {
  const existing = db.prepare("SELECT * FROM registrations WHERE email = ?").get(email);
  if (existing) {
    if (existing.unsubscribed_at) return { registration: existing, action: "resubscribe" };
    const newLive = liveId != null && existing.live_id !== liveId;
    if (newLive) db.prepare("UPDATE registrations SET live_id = ? WHERE id = ?").run(liveId, existing.id);
    return {
      registration: db.prepare("SELECT * FROM registrations WHERE id = ?").get(existing.id),
      action: newLive ? "confirm" : "none",
    };
  }
  const token = randomToken(24);
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO registrations (first_name, last_name, email, lang, live_id, unsubscribe_token)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(firstName, lastName, email, lang, liveId, token);
  return {
    registration: db.prepare("SELECT * FROM registrations WHERE id = ?").get(lastInsertRowid),
    action: "confirm",
  };
}

/** Liste complète pour le cockpit, avec le dernier email envoyé à chacun. */
export function listRegistrations() {
  return db
    .prepare(
      `SELECT r.*, l.title AS live_title,
              e.kind AS last_email_kind, e.status AS last_email_status,
              e.sent_at AS last_email_sent_at, e.created_at AS last_email_created_at,
              e.error AS last_email_error
         FROM registrations r
         LEFT JOIN lives l ON l.id = r.live_id
         LEFT JOIN email_logs e ON e.id = (
           SELECT MAX(id) FROM email_logs WHERE registration_id = r.id
         )
        ORDER BY r.created_at DESC`
    )
    .all()
    .map(toDto);
}

export function deleteRegistration(id) {
  return db.prepare("DELETE FROM registrations WHERE id = ?").run(id).changes > 0;
}

export function findByToken(token) {
  if (typeof token !== "string" || !token || token.length > 100) return null;
  return db.prepare("SELECT * FROM registrations WHERE unsubscribe_token = ?").get(token) ?? null;
}

/** Désinscription (lien présent dans chaque email). */
export function unsubscribeByToken(token) {
  const row = findByToken(token);
  if (row && !row.unsubscribed_at) {
    db.prepare("UPDATE registrations SET unsubscribed_at = ? WHERE id = ?").run(nowIso(), row.id);
  }
  return row;
}

/** Réinscription confirmée par la personne elle-même (lien reçu par email). */
export function resubscribeByToken(token) {
  const row = findByToken(token);
  if (row && row.unsubscribed_at) {
    db.prepare("UPDATE registrations SET unsubscribed_at = NULL WHERE id = ?").run(row.id);
  }
  return row;
}

export function registrationsSummary() {
  return db
    .prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(unsubscribed_at IS NULL), 0) AS active,
              COALESCE(SUM(created_at >= ? AND unsubscribed_at IS NULL), 0) AS last7Days
         FROM registrations`
    )
    .get(new Date(Date.now() - 7 * 86400_000).toISOString());
}

/* ------------------------------ Export CSV ------------------------------ */

/**
 * Échappe une cellule CSV et neutralise les formules (=, +, -, @) pour
 * éviter l'injection de formules à l'ouverture dans Excel.
 */
function csvCell(value) {
  let str = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  return /[";,\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Date lisible par Excel : « 2026-10-19 08:48 » dans le fuseau du site. */
function csvDate(iso) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: config.timezone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** CSV (séparateur `;` + BOM UTF-8 : s'ouvre directement dans Excel FR/ES). */
/** Export CSV, en-têtes et valeurs dans la langue du cockpit (es ou fr). */
export function registrationsCsv(lang = "es") {
  const fr = lang === "fr";
  const header = fr
    ? ["Prénom", "Nom", "Email", `Date d'inscription (${config.timezone})`, "Langue", "Statut", "Live"]
    : ["Nombre", "Apellido", "Email", `Fecha de inscripción (${config.timezone})`, "Idioma", "Estado", "Live"];
  const lines = listRegistrations().map((r) =>
    [
      r.firstName,
      r.lastName,
      r.email,
      csvDate(r.createdAt),
      r.lang,
      r.unsubscribedAt ? (fr ? "Désinscrit" : "Baja") : fr ? "Actif" : "Activo",
      r.liveTitle ?? "",
    ]
      .map(csvCell)
      .join(";")
  );
  return `﻿${[header.join(";"), ...lines].join("\r\n")}\r\n`;
}
