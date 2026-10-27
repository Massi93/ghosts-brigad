#!/usr/bin/env node
/**
 * Publie le site (projet Cloudflare Pages « dani-inmigracion ») en n'envoyant QUE ses fichiers web.
 *
 *   npm run site:deploy -- "/chemin/du/site" --dry-run   # liste ce qui serait publié, sans rien envoyer
 *   npm run site:deploy -- "/chemin/du/site"             # publie
 *
 * `wrangler pages deploy .` envoie tout le dossier, y compris les dossiers cachés
 * (`.claude/`, `.env`…) : ils deviendraient publics. Ici, le site est d'abord copié dans un
 * dossier temporaire, sans :
 *  - les fichiers et dossiers cachés (sauf `.well-known/`) ;
 *  - node_modules, les fichiers de paquets, les README / CLAUDE.md de la racine, les journaux ;
 *  - `functions/` et la configuration wrangler, placés À CÔTÉ du dossier publié (comme Pages l'attend).
 * Options : --project <nom> (dani-inmigracion), --branch <branche> (main).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_FILE = 25 * 1024 * 1024; // limite de Cloudflare Pages par fichier
const MAX_FILES = 20_000;

const args = process.argv.slice(2);
const option = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};
const dryRun = args.includes("--dry-run");
const project = option("project", "dani-inmigracion");
const branch = option("branch", "main");
const siteArg = args.find((a, i) => !a.startsWith("--") && !["--project", "--branch"].includes(args[i - 1]));

if (!siteArg) {
  console.error('Usage : npm run site:deploy -- "/chemin/du/dossier/du/site" [--dry-run]');
  process.exit(1);
}
const SITE = path.resolve(siteArg);
if (!fs.existsSync(path.join(SITE, "index.html"))) {
  console.error(`✖ ${SITE} ne contient pas d'index.html : est-ce bien le dossier du site ?`);
  process.exit(1);
}

const ROOT_ONLY = new Set(["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb", "CLAUDE.md"]);
const CONFIG = ["wrangler.toml", "wrangler.json", "wrangler.jsonc"];

/** Le fichier ou dossier `name` (à la profondeur `depth`) fait-il partie du site publié ? */
function publishable(name, depth, isDir) {
  if (name.startsWith(".")) return isDir && name === ".well-known";
  if (name === "node_modules") return false;
  if (name.endsWith(".log")) return false;
  if (depth === 0) {
    if (name === "functions" || CONFIG.includes(name) || ROOT_ONLY.has(name)) return false;
    if (/^readme(\.[a-z]+)?$/i.test(name)) return false;
  }
  return true;
}

/* 1. Inventaire ---------------------------------------------------------------- */

const files = [];
const skipped = new Map(); // élément ignoré à la racine → taille totale
const sizeOf = (p) => {
  const st = fs.lstatSync(p);
  if (st.isSymbolicLink()) return 0;
  if (!st.isDirectory()) return st.size;
  let total = 0;
  for (const e of fs.readdirSync(p)) total += sizeOf(path.join(p, e));
  return total;
};

function walk(dir, rel, depth) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) continue;
    if (!publishable(entry.name, depth, entry.isDirectory())) {
      if (depth === 0) skipped.set(entry.name, sizeOf(full));
      continue;
    }
    if (entry.isDirectory()) walk(full, relPath, depth + 1);
    else files.push({ rel: relPath, full, size: fs.statSync(full).size });
  }
}
walk(SITE, "", 0);

const mb = (n) => (n < 100 * 1024 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / 1048576).toFixed(1)} Mo`);
const total = files.reduce((n, f) => n + f.size, 0);
const tooBig = files.filter((f) => f.size > MAX_FILE);
const hasWorker = files.some((f) => f.rel === "_worker.js") || fs.existsSync(path.join(SITE, "_worker.js"));
const hasFunctions = fs.existsSync(path.join(SITE, "functions"));
const config = CONFIG.find((f) => fs.existsSync(path.join(SITE, f)));

console.log(`\nSite : ${SITE}`);
console.log(`Projet Pages : ${project} (branche ${branch})${dryRun ? "   — essai, rien n'est envoyé" : ""}\n`);
console.log(`Publié : ${files.length} fichiers, ${mb(total)}`);
for (const f of [...files].sort((a, b) => b.size - a.size).slice(0, 5)) console.log(`   ${mb(f.size).padStart(9)}  ${f.rel}`);
console.log(`Serveur : ${hasWorker ? "_worker.js (mode avancé)" : hasFunctions ? "functions/" : "aucun (site statique)"}${config ? ` · configuration ${config}` : ""}`);
if (skipped.size) {
  console.log("Non publié (racine) :");
  for (const [name, size] of skipped) console.log(`   ${name}${size ? ` (${mb(size)})` : ""}`);
}
const widgetPages = files.filter((f) => f.rel.endsWith(".html") && fs.readFileSync(f.full, "utf8").includes("/live/widget.js"));
console.log(`Widget du Live présent dans : ${widgetPages.map((f) => f.rel).join(", ") || "aucune page (lancer npm run site:integrate)"}`);

if (tooBig.length) {
  console.error(`\n✖ Fichiers de plus de 25 Mo (refusés par Cloudflare Pages) :`);
  for (const f of tooBig) console.error(`   ${mb(f.size)}  ${f.rel}`);
  process.exit(1);
}
if (files.length > MAX_FILES) {
  console.error(`\n✖ ${files.length} fichiers : Cloudflare Pages en accepte ${MAX_FILES} au maximum.`);
  process.exit(1);
}
if (dryRun) process.exit(0);

/* 2. Copie propre --------------------------------------------------------------- */

const STAGE = path.join(os.tmpdir(), "dani-site-deploy");
const PUBLIC = path.join(STAGE, "public");
fs.rmSync(STAGE, { recursive: true, force: true });
for (const f of files) {
  fs.mkdirSync(path.dirname(path.join(PUBLIC, f.rel)), { recursive: true });
  fs.copyFileSync(f.full, path.join(PUBLIC, f.rel));
}
if (hasFunctions) fs.cpSync(path.join(SITE, "functions"), path.join(STAGE, "functions"), { recursive: true });
if (config) {
  // Le dossier publié s'appelle désormais « public ».
  const text = fs
    .readFileSync(path.join(SITE, config), "utf8")
    .replace(/^(\s*pages_build_output_dir\s*=\s*).*$/m, '$1"public"')
    .replace(/("pages_build_output_dir"\s*:\s*)"[^"]*"/, '$1"public"');
  fs.writeFileSync(path.join(STAGE, config), text);
}

/* 3. Publication ---------------------------------------------------------------- */

const localWrangler = path.join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "wrangler.cmd" : "wrangler");
const [cmd, base] = fs.existsSync(localWrangler) ? [localWrangler, []] : ["npx", ["wrangler"]];
const deployArgs = [...base, "pages", "deploy", "public", "--project-name", project, "--branch", branch, "--commit-dirty=true"];
console.log(`\n→ wrangler ${deployArgs.slice(base.length).join(" ")}  (depuis ${STAGE})\n`);
const result = spawnSync(cmd, deployArgs, { cwd: STAGE, stdio: "inherit" });
process.exit(result.status ?? 1);
