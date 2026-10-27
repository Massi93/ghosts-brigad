/**
 * Change le mot de passe du cockpit.
 *
 *   npm run cockpit:password -- "nouveau-mot-de-passe"          → en ligne (secret Cloudflare)
 *   npm run cockpit:password -- "nouveau-mot-de-passe" --local  → en local (.dev.vars)
 *   npm run cockpit:password -- "nouveau-mot-de-passe" --print  → affiche seulement le hash
 *
 * Le mot de passe n'est jamais enregistré : seul son hash PBKDF2-SHA256 l'est,
 * dans le secret ADMIN_PASSWORD_HASH. Les sessions ouvertes sont fermées.
 */
import { execFileSync } from "node:child_process";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ITERATIONS = 100_000; // identique à worker/auth/password.js
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const password = args.find((a) => !a.startsWith("--"));

if (!password || password.length < 8) {
  console.error('Usage : npm run cockpit:password -- "nouveau-mot-de-passe" [--local | --print]');
  console.error("Le mot de passe doit contenir au moins 8 caractères.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256");
const value = `pbkdf2-sha256$${ITERATIONS}$${salt.toString("base64url")}$${hash.toString("base64url")}`;

if (flags.has("--print")) {
  console.log(value);
} else if (flags.has("--local")) {
  const file = path.join(root, ".dev.vars");
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const line = `ADMIN_PASSWORD_HASH='${value}'`;
  const lines = current.split("\n").filter((l) => !/^\s*(ADMIN_PASSWORD_HASH|ADMIN_PASSWORD)\s*=/.test(l));
  fs.writeFileSync(file, `${[...lines.filter((l, i) => l || i < lines.length - 1), line].join("\n")}\n`);
  console.log("Mot de passe local mis à jour dans .dev.vars (relance `npm run dev`).");
} else {
  console.log("Envoi du hash à Cloudflare (secret ADMIN_PASSWORD_HASH)…");
  execFileSync("npx", ["wrangler", "secret", "put", "ADMIN_PASSWORD_HASH"], {
    cwd: root,
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
  });
  console.log("Mot de passe du cockpit mis à jour. Les sessions ouvertes ont été fermées.");
}
