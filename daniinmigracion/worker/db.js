/**
 * Base de données SQLite intégrée au Durable Object (stockage persistant de Cloudflare).
 *
 * Petit adaptateur qui reproduit l'API synchrone de `better-sqlite3`
 * (`db.prepare(sql).get / all / run`) au-dessus de `ctx.storage.sql`.
 * Aucune base externe à créer : les données vivent avec le Durable Object.
 */

const SCHEMA = `
-- Sessions du cockpit : on ne stocke que le hash SHA-256 du jeton du cookie.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  username   TEXT NOT NULL,
  ip         TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL
);

-- Lives programmés, en cours ou passés.
CREATE TABLE IF NOT EXISTS lives (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  title          TEXT NOT NULL,
  description    TEXT,
  scheduled_at   TEXT,               -- NULL pour un live lancé sans programmation
  status         TEXT NOT NULL DEFAULT 'scheduled'
                 CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled', 'missed')),
  started_at     TEXT,
  ended_at       TEXT,
  interrupted_at TEXT,               -- caméra perdue (fin automatique après le délai de grâce)
  hearts         INTEGER NOT NULL DEFAULT 0,
  peak_viewers   INTEGER NOT NULL DEFAULT 0,
  total_viewers  INTEGER NOT NULL DEFAULT 0,  -- connexions de viewers cumulées
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS lives_status_idx ON lives(status, scheduled_at);

-- Enregistrements vidéo. Les morceaux sont stockés dans R2 (un objet par morceau).
-- Un live peut avoir plusieurs segments si la caméra a été relancée.
CREATE TABLE IF NOT EXISTS recordings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  live_id       INTEGER REFERENCES lives(id) ON DELETE SET NULL,
  filename      TEXT NOT NULL UNIQUE,   -- nom proposé au téléchargement
  mime_type     TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL DEFAULT 0,
  duration_ms   INTEGER,
  status        TEXT NOT NULL DEFAULT 'recording'
                CHECK (status IN ('recording', 'ready', 'failed')),
  last_chunk_at TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  finished_at   TEXT
);

-- Morceaux d'un enregistrement (≈ 2 s de vidéo chacun), dans l'ordre.
CREATE TABLE IF NOT EXISTS recording_chunks (
  recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  seq          INTEGER NOT NULL,
  size         INTEGER NOT NULL,
  PRIMARY KEY (recording_id, seq)
);

-- Inscrits au live (une ligne par adresse email).
CREATE TABLE IF NOT EXISTS registrations (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE COLLATE NOCASE,
  lang              TEXT NOT NULL DEFAULT 'es',  -- langue du site à l'inscription (es, fr, ar)
  live_id           INTEGER REFERENCES lives(id) ON DELETE SET NULL, -- live visé à l'inscription
  unsubscribe_token TEXT NOT NULL UNIQUE,
  unsubscribed_at   TEXT,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Journal de tous les emails (confirmation, rappels automatiques, envois manuels).
CREATE TABLE IF NOT EXISTS email_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  registration_id INTEGER REFERENCES registrations(id) ON DELETE CASCADE,
  live_id         INTEGER REFERENCES lives(id) ON DELETE SET NULL,
  kind            TEXT NOT NULL
                  CHECK (kind IN ('confirmation', 'resubscribe', 'reminder_3h', 'reminder_5m', 'manual', 'test')),
  batch_id        TEXT,
  to_email        TEXT NOT NULL,
  subject         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error           TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  sent_at         TEXT
);
CREATE INDEX IF NOT EXISTS email_logs_registration_idx ON email_logs(registration_id, id);
CREATE INDEX IF NOT EXISTS email_logs_batch_idx ON email_logs(batch_id);
-- Garantit qu'un rappel automatique n'est jamais envoyé deux fois à la même personne.
CREATE UNIQUE INDEX IF NOT EXISTS email_logs_reminder_once
  ON email_logs(registration_id, live_id, kind)
  WHERE kind IN ('reminder_3h', 'reminder_5m');

-- Mode « console » : copie des derniers emails (aucun envoi réel), consultable dans le cockpit.
CREATE TABLE IF NOT EXISTS mail_outbox (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email   TEXT NOT NULL,
  subject    TEXT NOT NULL,
  html       TEXT NOT NULL,
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Réglages du site modifiables depuis le cockpit (clé / valeur JSON).
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

let storage = null;

/** Exécute une requête et retourne toutes les lignes. */
function query(sqlText, params) {
  return storage.sql.exec(sqlText, ...params.map(normalizeParam)).toArray();
}

/** SQLite n'accepte pas `undefined` ni les booléens : conversion explicite. */
function normalizeParam(value) {
  if (value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

/** API façon better-sqlite3 (synchrone). */
export const db = {
  prepare(sqlText) {
    return {
      get: (...params) => query(sqlText, params)[0],
      all: (...params) => query(sqlText, params),
      run: (...params) => {
        query(sqlText, params);
        const info = storage.sql.exec("SELECT changes() AS changes, last_insert_rowid() AS id").one();
        return { changes: info.changes, lastInsertRowid: info.id };
      },
    };
  },
  exec(sqlText) {
    storage.sql.exec(sqlText);
  },
  /** Retourne une fonction qui exécute `fn` dans une transaction (tout ou rien). */
  transaction(fn) {
    return (...args) => storage.transactionSync(() => fn(...args));
  },
};

/** Branche la base sur le stockage du Durable Object et applique le schéma. */
export function openDatabase(ctxStorage) {
  storage = ctxStorage;
  db.exec(SCHEMA);
  return db;
}

/** Date courante au format stocké en base. */
export function nowIso() {
  return new Date().toISOString();
}
