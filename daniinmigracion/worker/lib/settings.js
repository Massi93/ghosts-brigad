/**
 * Réglages du site modifiables depuis le cockpit (rubrique « Próximo live »).
 * Stockés en base (table `settings`) avec des valeurs par défaut.
 */
import { db } from "../db.js";

export const DEFAULT_SETTINGS = {
  liveSectionEnabled: true,
  liveSectionTitle: "Próximo live",
  liveSectionText:
    "Conéctate en directo con Dani: resolvemos tus dudas sobre visas, residencia y nacionalidad en tiempo real.",
};

/** Retourne tous les réglages (défauts + valeurs enregistrées). */
export function getSettings() {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const saved = {};
  for (const { key, value } of rows) {
    if (key in DEFAULT_SETTINGS) {
      try {
        saved[key] = JSON.parse(value);
      } catch {
        // valeur corrompue : on garde le défaut
      }
    }
  }
  return { ...DEFAULT_SETTINGS, ...saved };
}

/** Met à jour les réglages fournis (les clés inconnues sont ignorées). */
export function updateSettings(patch) {
  const upsert = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );
  const apply = db.transaction((entries) => {
    for (const [key, value] of entries) upsert.run(key, JSON.stringify(value));
  });
  apply(Object.entries(patch).filter(([key]) => key in DEFAULT_SETTINGS));
  return getSettings();
}

/* Valeurs techniques internes (non exposées), ex. empreinte du mot de passe. */

export function getInternal(key) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(`internal:${key}`);
  return row ? JSON.parse(row.value) : null;
}

export function setInternal(key, value) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(`internal:${key}`, JSON.stringify(value));
}
