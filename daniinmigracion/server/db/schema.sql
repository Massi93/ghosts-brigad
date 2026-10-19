-- Schéma SQLite de la fonctionnalité Live.
-- Exécuté à chaque démarrage : toutes les instructions sont idempotentes.
-- Les dates sont stockées en ISO 8601 UTC (ex. 2026-10-19T18:00:00.000Z).

-- Comptes du cockpit (mot de passe hashé avec bcrypt).
CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Sessions du cockpit : on ne stocke que le hash SHA-256 du jeton du cookie.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id   INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  ip         TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL
);

-- Lives programmés, en cours ou passés.
CREATE TABLE IF NOT EXISTS lives (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  description   TEXT,
  scheduled_at  TEXT,               -- NULL pour un live lancé sans programmation
  status        TEXT NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled', 'missed')),
  started_at    TEXT,
  ended_at      TEXT,
  hearts        INTEGER NOT NULL DEFAULT 0,
  peak_viewers  INTEGER NOT NULL DEFAULT 0,
  total_viewers INTEGER NOT NULL DEFAULT 0,  -- connexions de viewers cumulées
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS lives_status_idx ON lives(status, scheduled_at);

-- Enregistrements vidéo (fichiers dans server/storage/recordings/).
-- Un live peut avoir plusieurs segments si la caméra a été relancée.
CREATE TABLE IF NOT EXISTS recordings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  live_id     INTEGER REFERENCES lives(id) ON DELETE SET NULL,
  filename    TEXT NOT NULL UNIQUE,
  mime_type   TEXT NOT NULL,
  size_bytes  INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  status      TEXT NOT NULL DEFAULT 'recording'
              CHECK (status IN ('recording', 'ready', 'failed')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  finished_at TEXT
);

-- Inscrits au live (une ligne par adresse email).
CREATE TABLE IF NOT EXISTS registrations (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE COLLATE NOCASE,
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
                  CHECK (kind IN ('confirmation', 'reminder_3h', 'reminder_5m', 'manual', 'test')),
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

-- Réglages du site modifiables depuis le cockpit (clé / valeur JSON).
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
