#!/usr/bin/env node
/**
 * Branche le Live sur le projet Cloudflare Pages du site (www.daniinmigracion.com).
 *
 *   npm run site:integrate -- "/chemin/du/site"            # applique les changements
 *   npm run site:integrate -- "/chemin/du/site" --dry-run  # montre seulement ce qui serait fait
 *
 * Ce que fait le script (on peut le relancer sans risque, il ne refait pas ce qui est déjà fait) :
 *  1. copie `site-integration/functions/` dans `functions/` du site (mode « Functions ») ;
 *  2. si le site a un `_worker.js` (mode « avancé », Cloudflare ignore alors `functions/`) :
 *     ajoute à la fin du fichier un petit relais vers le Worker du Live
 *     (copie de sauvegarde dans `daniinmigracion/.site-backup/`, hors du site publié) ;
 *  3. ajoute `<script src="/live/widget.js" defer></script>` avant `</body>` dans les pages
 *     HTML à la racine du site (index.html, apostilla.html…) ;
 *  4. complète `_routes.json` et la configuration wrangler du site s'ils existent.
 *
 * Il reste ensuite à créer la liaison de service LIVE (tableau de bord) et à republier le site.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_FUNCTIONS = path.join(ROOT, "site-integration", "functions");
const BACKUP_DIR = path.join(ROOT, ".site-backup");
const SCRIPT_TAG = '<script src="/live/widget.js" defer></script>';
const MARKER = "Live Dani Inmigración (npm run site:integrate)";
const LIVE_ROUTES = ["/live", "/live/*", "/cockpit", "/cockpit/*", "/api/live/*"];
// Dossiers jamais modifiés.
const SKIP_DIRS = new Set(["node_modules", ".git", ".wrangler", ".claude", "functions"]);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const siteArg = args.find((a) => !a.startsWith("--"));

if (!siteArg) {
  console.error('Usage : npm run site:integrate -- "/chemin/du/dossier/du/site" [--dry-run]');
  process.exit(1);
}
const SITE = path.resolve(siteArg);
if (!fs.existsSync(path.join(SITE, "index.html"))) {
  console.error(`✖ ${SITE} ne contient pas d'index.html : est-ce bien le dossier publié du site ?`);
  process.exit(1);
}

const done = [];
const todo = [];
const rel = (p) => path.relative(SITE, p) || ".";

function write(file, content) {
  if (!dryRun) fs.writeFileSync(file, content);
}

function backup(file) {
  if (dryRun) return null;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(BACKUP_DIR, `${path.basename(file)}.${stamp}`);
  fs.copyFileSync(file, dest);
  return dest;
}

/* 1. Fichiers functions/ (relais /live, /cockpit, /api/live) ------------------ */

function copyFunctions(from, to) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      if (!dryRun) fs.mkdirSync(dest, { recursive: true });
      copyFunctions(src, dest);
    } else {
      const content = fs.readFileSync(src, "utf8");
      if (fs.existsSync(dest) && fs.readFileSync(dest, "utf8") === content) continue;
      write(dest, content);
      done.push(`functions : ${rel(dest)}`);
    }
  }
}
copyFunctions(SOURCE_FUNCTIONS, path.join(SITE, "functions"));

/* 2. Mode avancé : _worker.js -------------------------------------------------- */

function patchWorker(file) {
  const code = fs.readFileSync(file, "utf8");
  if (code.includes(MARKER)) return "already";
  const exports = code.match(/^export\s+default\b/gm) || [];
  // Seul le cas courant est modifié automatiquement : `export default { … }` ou `export default app;`.
  if (exports.length !== 1 || /^export\s+default\s+(async\s+)?(class|function)\b/m.test(code)) return "manual";
  const patched =
    code.replace(/^export\s+default\b/m, "const __daniSite =") +
    `

// ── ${MARKER} ──
// /live, /cockpit et /api/live sont servis par le Worker « dani-live » (liaison de service LIVE).
const __DANI_LIVE_PATHS = /^\\/(?:live|cockpit)(?:\\/|$)|^\\/api\\/live(?:\\/|$)/;
export default {
  ...__daniSite,
  async fetch(request, env, ctx) {
    if (__DANI_LIVE_PATHS.test(new URL(request.url).pathname)) {
      if (!env.LIVE) {
        return new Response("Live no configurado: falta la vinculación de servicio LIVE (Pages → Settings → Bindings).", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
      return env.LIVE.fetch(request);
    }
    return __daniSite.fetch(request, env, ctx);
  },
};
`;
  const saved = backup(file);
  write(file, patched);
  return saved ? `patched (sauvegarde : ${saved})` : "patched";
}

const workerPath = path.join(SITE, "_worker.js");
let advancedMode = false;
if (fs.existsSync(workerPath)) {
  advancedMode = true;
  const target = fs.statSync(workerPath).isDirectory() ? path.join(workerPath, "index.js") : workerPath;
  const result = fs.existsSync(target) ? patchWorker(target) : "manual";
  if (result === "already") done.push(`${rel(target)} : relais Live déjà présent`);
  else if (result === "manual") {
    todo.push(
      `${rel(target)} n'a pas pu être modifié automatiquement. Au début de sa fonction fetch(request, env, ctx), ajouter :\n` +
        "      const p = new URL(request.url).pathname;\n" +
        "      if (/^\\/(?:live|cockpit)(?:\\/|$)|^\\/api\\/live(?:\\/|$)/.test(p)) return env.LIVE.fetch(request);"
    );
  } else done.push(`${rel(target)} : relais Live ajouté — ${result}`);
}

/* 3. Balise <script> du widget dans les pages HTML de la racine ---------------- */

for (const name of fs.readdirSync(SITE)) {
  if (!name.endsWith(".html")) continue;
  const file = path.join(SITE, name);
  const html = fs.readFileSync(file, "utf8");
  if (html.includes("/live/widget.js")) continue;
  const at = html.toLowerCase().lastIndexOf("</body>");
  if (at === -1) {
    todo.push(`${name} : pas de </body>, ajouter à la main ${SCRIPT_TAG}`);
    continue;
  }
  const tag = `<!-- Live de Dani Inmigración : bouton LIVE + rubrique « Próximo live » -->\n${SCRIPT_TAG}\n`;
  write(file, html.slice(0, at) + tag + html.slice(at));
  done.push(`${name} : widget ajouté`);
}

/* 4. _routes.json et configuration wrangler du site ---------------------------- */

const routesPath = path.join(SITE, "_routes.json");
if (fs.existsSync(routesPath)) {
  try {
    const routes = JSON.parse(fs.readFileSync(routesPath, "utf8"));
    const include = Array.isArray(routes.include) ? routes.include : [];
    // Une règle « /api/* » couvre déjà « /api/live/* » (Cloudflare refuse les règles qui se chevauchent).
    const covered = (route) =>
      include.some((rule) => rule === route || (rule.endsWith("/*") && route.startsWith(rule.slice(0, -1))));
    if (!include.includes("/*")) {
      const missing = LIVE_ROUTES.filter((r) => !covered(r));
      if (missing.length) {
        routes.include = [...include, ...missing];
        write(routesPath, `${JSON.stringify(routes, null, 2)}\n`);
        done.push(`_routes.json : ajouté ${missing.join(", ")}`);
      }
    }
    const excluded = (routes.exclude || []).filter((r) => /^\/(live|cockpit|api)/.test(r));
    if (excluded.length) todo.push(`_routes.json exclut ${excluded.join(", ")} : à retirer pour le Live`);
  } catch {
    todo.push("_routes.json illisible : y ajouter à la main " + LIVE_ROUTES.join(", "));
  }
}

const toml = path.join(SITE, "wrangler.toml");
const jsonConfig = ["wrangler.json", "wrangler.jsonc"].map((f) => path.join(SITE, f)).find((f) => fs.existsSync(f));
let bindingInFile = false;
if (fs.existsSync(toml)) {
  // Quand le site a un wrangler.toml, ses liaisons remplacent celles du tableau de bord.
  const content = fs.readFileSync(toml, "utf8");
  bindingInFile = true;
  if (!/binding\s*=\s*"LIVE"/.test(content)) {
    write(toml, `${content.replace(/\s*$/, "")}\n\n# ${MARKER}\n[[services]]\nbinding = "LIVE"\nservice = "dani-live"\n`);
    done.push('wrangler.toml : liaison de service LIVE → dani-live ajoutée');
  }
} else if (jsonConfig) {
  bindingInFile = true;
  if (!/"binding"\s*:\s*"LIVE"/.test(fs.readFileSync(jsonConfig, "utf8"))) {
    todo.push(`${path.basename(jsonConfig)} : ajouter "services": [{ "binding": "LIVE", "service": "dani-live" }]`);
  }
}

/* Résumé ---------------------------------------------------------------------- */

console.log(`\nSite : ${SITE}${dryRun ? "   (essai : rien n'a été modifié)" : ""}`);
console.log(`Mode : ${advancedMode ? "_worker.js (mode avancé)" : "functions/"}\n`);
if (done.length) console.log(`${dryRun ? "Serait fait" : "Fait"} :\n${done.map((d) => `  ✔ ${d}`).join("\n")}\n`);
else console.log("Rien à changer : le site est déjà branché.\n");
if (todo.length) console.log(`À faire à la main :\n${todo.map((d) => `  ⚠ ${d}`).join("\n")}\n`);
console.log("Ensuite :");
if (!bindingInFile) {
  console.log(
    "  1. Cloudflare → Workers & Pages → dani-inmigracion → Settings → Bindings → Add → Service binding :\n" +
      "     nom LIVE, service dani-live (Production)."
  );
}
console.log(`  ${bindingInFile ? 1 : 2}. Republier le site depuis son dossier :`);
console.log(`     cd "${SITE}" && npx wrangler pages deploy . --project-name dani-inmigracion --branch main --commit-dirty=true`);
