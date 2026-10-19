/**
 * Accès à la base SQLite (fichier unique, aucune installation de serveur).
 * `better-sqlite3` est synchrone : simple, rapide et sans callback.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { config } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("better-sqlite3").Database} */
export let db;

/** Ouvre la base, applique le schéma et retourne l'instance. */
export function openDatabase(file = config.paths.database) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
  return db;
}

/** Date courante au format stocké en base. */
export function nowIso() {
  return new Date().toISOString();
}
