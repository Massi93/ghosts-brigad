/**
 * Comptes administrateur du cockpit.
 * Le mot de passe n'est jamais stocké en clair : uniquement son hash bcrypt.
 */
import bcrypt from "bcryptjs";
import { db } from "../db/index.js";
import { config } from "../config.js";

const BCRYPT_ROUNDS = 12;

// Hash factice : permet de faire un `compare` même si l'utilisateur n'existe pas,
// pour que le temps de réponse ne révèle pas quels identifiants existent.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", BCRYPT_ROUNDS);

export function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Crée le compte de Dani au premier démarrage (identifiants issus de la config). */
export async function ensureDefaultAdmin() {
  const { username, password } = config.admin;
  const existing = db.prepare("SELECT id FROM admins WHERE username = ?").get(username);
  if (existing) return;
  const hash = await hashPassword(password);
  db.prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)").run(username, hash);
  console.log(`[auth] Compte cockpit « ${username} » créé (mot de passe hashé avec bcrypt).`);
}

/** Change le mot de passe d'un compte (utilisé par `npm run cockpit:password`). */
export async function setAdminPassword(username, password) {
  const hash = await hashPassword(password);
  const result = db
    .prepare("UPDATE admins SET password_hash = ? WHERE username = ?")
    .run(hash, username);
  if (result.changes === 0) {
    db.prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)").run(username, hash);
  }
  // Toutes les sessions existantes de ce compte sont invalidées.
  db.prepare(
    "DELETE FROM sessions WHERE admin_id = (SELECT id FROM admins WHERE username = ?)"
  ).run(username);
}

/** Vérifie des identifiants ; retourne l'admin ou `null`. */
export async function verifyCredentials(username, password) {
  const admin = db
    .prepare("SELECT id, username, password_hash FROM admins WHERE username = ?")
    .get(username);
  const ok = await bcrypt.compare(password, admin ? admin.password_hash : DUMMY_HASH);
  return ok && admin ? { id: admin.id, username: admin.username } : null;
}
