/**
 * Mot de passe du cockpit.
 *
 * Il n'est jamais stocké en clair : le secret Cloudflare `ADMIN_PASSWORD_HASH`
 * contient uniquement son hash PBKDF2-SHA256 (100 000 itérations, sel aléatoire),
 * généré par `npm run cockpit:password -- "mot-de-passe"`.
 *
 * Format : pbkdf2-sha256$<itérations>$<sel base64url>$<hash base64url>
 */
import { config } from "../config.js";
import { getInternal, setInternal } from "../lib/settings.js";
import { db } from "../db.js";
import { b64urlDecode, b64urlEncode, sha256Hex, timingSafeEqual } from "../lib/crypto.js";

export const PBKDF2_ITERATIONS = 100_000; // maximum accepté par Cloudflare Workers
const DEFAULT_PASSWORD = "daniinmigracion"; // identifiants de démonstration du cahier des charges

let activeHash = null; // hash utilisé pour vérifier les connexions
let usesDefault = false;

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

/** Calcule le hash d'un mot de passe au format stocké. */
export async function hashPassword(password, iterations = PBKDF2_ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, iterations);
  return `pbkdf2-sha256$${iterations}$${b64urlEncode(salt)}$${b64urlEncode(hash)}`;
}

/** Vérifie un mot de passe contre un hash (temps constant). */
export async function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256") return false;
  const iterations = Number.parseInt(parts[1], 10);
  if (!Number.isInteger(iterations) || iterations < 1000 || iterations > PBKDF2_ITERATIONS) return false;
  const expected = b64urlDecode(parts[3]);
  const actual = await pbkdf2(password, b64urlDecode(parts[2]), iterations);
  return timingSafeEqual(actual, expected);
}

/**
 * Au démarrage : choisit le hash actif et ferme toutes les sessions si le mot de
 * passe (ou l'identifiant) a changé depuis le dernier démarrage.
 */
export async function initAdminPassword() {
  const { passwordHash, password, username } = config.admin;
  usesDefault = false;
  if (passwordHash) {
    activeHash = passwordHash;
  } else if (password) {
    activeHash = await hashPassword(password);
  } else {
    activeHash = await hashPassword(DEFAULT_PASSWORD);
    usesDefault = true;
    console.warn(
      `[auth] ⚠️  Le cockpit utilise le mot de passe par défaut. Avant toute mise en ligne : npm run cockpit:password -- "nouveau-mot-de-passe"`
    );
  }
  // Empreinte de la configuration (jamais le mot de passe lui-même).
  const source = passwordHash || (password ? `plain:${await sha256Hex(password)}` : "default");
  const fingerprint = await sha256Hex(`${username}\n${source}`);
  if (getInternal("authFingerprint") !== fingerprint) {
    db.prepare("DELETE FROM sessions").run();
    setInternal("authFingerprint", fingerprint);
  }
}

/** `true` si le cockpit utilise encore le mot de passe d'exemple. */
export function usesDocumentedPassword() {
  return usesDefault;
}

// Hash factice : la vérification prend le même temps quel que soit l'identifiant saisi.
let dummyHash = null;

/** Vérifie des identifiants ; retourne `{ username }` ou `null`. */
export async function verifyCredentials(username, password) {
  dummyHash ??= await hashPassword("dummy-password-for-timing");
  const userOk = username === config.admin.username;
  const ok = await verifyPassword(password, userOk ? activeHash : dummyHash);
  return ok && userOk ? { username } : null;
}
