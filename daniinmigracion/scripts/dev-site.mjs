/**
 * Maquette locale du site principal avec le Live intégré : npm run dev:site
 *
 * Reproduit en local la configuration en ligne :
 *   http://localhost:8788            → maquette de www.daniinmigracion.com (site-integration/preview)
 *   /live, /cockpit, /api/live/…     → Pages Functions (site-integration/functions) → Worker « dani-live »
 *
 * Le Worker doit tourner en parallèle (`npm run dev`, port 8787).
 * Les fichiers sont copiés dans un dossier temporaire : wrangler ne doit pas y voir
 * la configuration du Worker (wrangler.jsonc), qui n'est pas celle d'un projet Pages.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const work = path.join(os.tmpdir(), "dani-site-preview");
fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });
fs.cpSync(path.join(root, "site-integration", "functions"), path.join(work, "functions"), { recursive: true });
fs.cpSync(path.join(root, "site-integration", "preview"), path.join(work, "preview"), { recursive: true });

const wrangler = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "wrangler.cmd" : "wrangler");
const child = spawn(
  wrangler,
  ["pages", "dev", "preview", "--port", "8788", "--service", "LIVE=dani-live", "--compatibility-date", "2026-10-01"],
  { cwd: work, stdio: "inherit", shell: process.platform === "win32" }
);
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
