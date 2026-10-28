/**
 * Configure l'envoi RÉEL des emails du Live (confirmations, rappels, « Prévenir par e-mail »).
 *
 *   npm run mail:setup              → questions guidées (Gmail ou Brevo), puis publication
 *   npm run mail:setup -- --console → revient au mode test (aucun email envoyé)
 *   npm run mail:setup -- --dry-run → montre les changements sans rien publier
 *
 * Gmail : l'adresse Gmail de Dani + un « mot de passe d'application » Google (16 lettres),
 *         à créer sur https://myaccount.google.com/apppasswords (validation en deux étapes requise).
 *         Limite Google : environ 500 emails par jour.
 * Brevo : une clé API (xkeysib-…) et une adresse d'expédition vérifiée chez Brevo.
 *
 * Les valeurs publiques (mode, expéditeur, serveur) vont dans wrangler.jsonc ;
 * le mot de passe ou la clé vont dans les secrets Cloudflare (jamais dans le dépôt).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = path.join(root, "wrangler.jsonc");
const flags = new Set(process.argv.slice(2));
const dryRun = flags.has("--dry-run");
const DEFAULT_GMAIL = "dani.inmigracion.es@gmail.com";
const SENDER_NAME = "Dani Inmigración";

/* ------------------------------ Questions ------------------------------ */

const tty = Boolean(process.stdin.isTTY);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: tty });
rl.setPrompt("");
const lines = rl[Symbol.asyncIterator]();
let muted = false;
// Saisie masquée : chaque caractère tapé s'affiche « • ».
rl._writeToOutput = (text) => rl.output.write(muted ? (text.includes("\n") ? "\n" : "•") : text);

async function ask(question, { hidden = false, fallback = "" } = {}) {
  process.stdout.write(question);
  muted = hidden && tty;
  const { value } = await lines.next();
  muted = false;
  if (!tty) process.stdout.write("\n");
  return (value ?? "").trim() || fallback;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Nettoie une clé collée : espaces, guillemets, marqueurs de collage du terminal. */
function cleanKey(value) {
  return value
    .replace(/\x1b\[20[01]~/g, "")
    .replace(/\s+/g, "")
    .replace(/^["'`]+|["'`]+$/g, "");
}

/**
 * Essaie la clé auprès de Brevo AVANT de modifier quoi que ce soit.
 * Un envoi vide (refusé par Brevo, donc rien ne part) montre si la clé existe et a le droit
 * d'envoyer des e-mails transactionnels ; l'expéditeur est vérifié si la clé le permet.
 */
async function checkBrevoKey(key, from) {
  const call = (route, init = {}) =>
    fetch(`https://api.brevo.com/v3${route}`, {
      ...init,
      headers: { "api-key": key, accept: "application/json", "content-type": "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
  let probe;
  try {
    probe = await call("/smtp/email", { method: "POST", body: "{}" });
  } catch {
    console.warn("⚠ Impossible de joindre Brevo pour vérifier la clé (connexion internet ?). On continue sans vérification.");
    return;
  }
  if (probe.status === 401 || probe.status === 403) {
    const data = await probe.json().catch(() => ({}));
    fail(
      `Brevo refuse cette clé pour l'envoi d'e-mails : « ${data.message || probe.status} ».\n` +
        "Colle la NOUVELLE clé (Brevo → SMTP et API → Clés API), avec la permission « Transactional email »."
    );
  }
  // 400 attendu : la clé est acceptée, seul l'e-mail vide est refusé.
  const senders = await call("/senders")
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  if (!senders) {
    console.log("✔ Clé Brevo valide pour l'envoi d'e-mails.");
    console.log(`  (cette clé ne peut pas lire la liste des expéditeurs : vérifie dans Brevo que ${from} est « Vérifié »)`);
    return;
  }
  const sender = senders.senders?.find((x) => x.email?.toLowerCase() === from.toLowerCase());
  if (!sender) fail(`L'expéditeur ${from} n'existe pas dans ce compte Brevo (Brevo → Expéditeurs).`);
  if (sender.active === false) fail(`L'expéditeur ${from} n'est pas encore vérifié dans Brevo.`);
  console.log(`✔ Clé Brevo valide, expéditeur ${from} vérifié.`);
}

function fail(message) {
  console.error(`\n✖ ${message}\nRien n'a été modifié.`);
  process.exit(1);
}

/* --------------------------- wrangler.jsonc ---------------------------- */

/** Remplace (ou ajoute après MAIL_FROM) une variable `"NOM": "valeur"` dans wrangler.jsonc. */
function setVar(text, name, value) {
  const line = new RegExp(`("${name}"\\s*:\\s*)"[^"]*"`);
  if (line.test(text)) return text.replace(line, `$1${JSON.stringify(value)}`);
  return text.replace(/^(\s*)("MAIL_FROM"\s*:\s*"[^"]*",?)$/m, (_m, indent, decl) => {
    const withComma = decl.endsWith(",") ? decl : `${decl},`;
    return `${indent}${withComma}\n${indent}"${name}": ${JSON.stringify(value)},`;
  });
}

function removeVar(text, name) {
  return text.replace(new RegExp(`^\\s*"${name}"\\s*:\\s*"[^"]*",?\\n`, "m"), "");
}

function secret(name, value) {
  if (dryRun) return console.log(`  (essai) secret ${name} : ${"•".repeat(Math.min(value.length, 16))}`);
  console.log(`→ Secret Cloudflare ${name}…`);
  execFileSync("npx", ["wrangler", "secret", "put", name], { cwd: root, input: value, stdio: ["pipe", "inherit", "inherit"] });
}

/* -------------------------------- Main --------------------------------- */

let text = fs.readFileSync(CONFIG, "utf8");
let summary;

if (flags.has("--console")) {
  text = setVar(text, "MAIL_MODE", "console");
  summary = "Mode test : aucun email réel ne sera envoyé.";
} else {
  console.log("\nEnvoi réel des emails du Live\n");
  console.log("  1) Gmail  — le plus simple : l'adresse Gmail de Dani + un mot de passe d'application");
  console.log("  2) Brevo  — pour beaucoup d'inscrits (clé API Brevo)\n");
  const choice = await ask("Choix [1] : ", { fallback: "1" });

  if (choice === "2") {
    const from = await ask("Adresse d'expédition vérifiée chez Brevo : ");
    if (!EMAIL_RE.test(from)) fail("Adresse invalide.");
    const key = cleanKey(await ask("Clé Brevo (API « xkeysib-… » ou SMTP « xsmtpsib-… », masquée) : ", { hidden: true }));
    text = setVar(text, "MAIL_FROM", `${SENDER_NAME} <${from}>`);
    if (key.startsWith("xkeysib-")) {
      await checkBrevoKey(key, from);
      // Clé API (onglet « Clés API ») : envoi par l'API HTTP de Brevo.
      text = setVar(text, "MAIL_MODE", "brevo");
      for (const name of ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE"]) text = removeVar(text, name);
      secret("MAIL_API_KEY", key);
      summary = `Brevo (API), expéditeur ${from}.`;
    } else if (key.startsWith("xsmtpsib-")) {
      // Clé SMTP (onglet « SMTP ») : il faut aussi l'identifiant SMTP affiché sur la même page.
      console.log("\nC'est une clé SMTP. Sur la même page Brevo (onglet SMTP), copie l'« Identifiant » (ex. 9a1b2c001@smtp-brevo.com).");
      const login = await ask("Identifiant SMTP Brevo : ");
      if (!EMAIL_RE.test(login)) fail("L'identifiant SMTP Brevo ressemble à une adresse email (…@smtp-brevo.com).");
      text = setVar(text, "MAIL_MODE", "smtp");
      text = setVar(text, "SMTP_HOST", "smtp-relay.brevo.com");
      text = setVar(text, "SMTP_PORT", "587");
      text = setVar(text, "SMTP_SECURE", "false");
      secret("SMTP_USER", login);
      secret("SMTP_PASS", key);
      summary = `Brevo (SMTP), expéditeur ${from}.`;
    } else {
      fail(
        `Clé non reconnue (elle commence par « ${key.slice(0, 9)}… »).\n` +
          "Brevo → SMTP et API → onglet « Clés API » → « Générer une nouvelle clé API » : la clé commence par « xkeysib- »."
      );
    }
  } else {
    console.log("\nMot de passe d'application Google : https://myaccount.google.com/apppasswords");
    console.log("(il faut que la validation en deux étapes soit activée sur le compte Gmail)\n");
    const from = (await ask(`Adresse Gmail [${DEFAULT_GMAIL}] : `, { fallback: DEFAULT_GMAIL })).toLowerCase();
    if (!EMAIL_RE.test(from)) fail("Adresse invalide.");
    const pass = (await ask("Mot de passe d'application (16 lettres, masqué) : ", { hidden: true })).replace(/\s+/g, "");
    if (!/^[a-z]{16}$/i.test(pass)) {
      fail("Le mot de passe d'application Google fait 16 lettres (ce n'est pas le mot de passe du compte Gmail).");
    }
    text = setVar(text, "MAIL_MODE", "smtp");
    text = setVar(text, "MAIL_FROM", `${SENDER_NAME} <${from}>`);
    text = setVar(text, "SMTP_HOST", "smtp.gmail.com");
    text = setVar(text, "SMTP_PORT", "465");
    text = setVar(text, "SMTP_SECURE", "true");
    secret("SMTP_USER", from);
    secret("SMTP_PASS", pass);
    summary = `Gmail (${from}), environ 500 emails par jour maximum.`;
  }
}
rl.close();

if (dryRun) {
  console.log("\n(essai) wrangler.jsonc deviendrait :\n");
  console.log(text.split("\n").filter((l) => /"(MAIL_|SMTP_)/.test(l)).join("\n"));
  process.exit(0);
}
fs.writeFileSync(CONFIG, text);
console.log("\n→ Publication du serveur du Live (npm run deploy)…\n");
execFileSync("npm", ["run", "deploy"], { cwd: root, stdio: "inherit" });
console.log(`\n✔ ${summary}`);
console.log("Vérifie dans le cockpit : Site → « E-mail de test » → envoie-toi un e-mail.");
