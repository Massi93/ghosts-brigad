/**
 * Configuration centralisée du serveur.
 *
 * Toutes les valeurs viennent des variables d'environnement (fichier `.env`
 * à la racine du projet, voir `.env.example`). Chaque valeur a un défaut
 * pensé pour le développement local : le serveur démarre sans `.env`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Racine du projet (dossier `daniinmigracion/`). */
export const ROOT_DIR = path.resolve(__dirname, "..");

// Chargement du `.env` avec le support natif de Node (>= 20.12), sans dépendance.
const envFile = path.join(ROOT_DIR, ".env");
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const env = process.env;

/** Lit un booléen ("true", "1", "yes", "on"). */
function bool(value, fallback) {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

/** Lit un entier positif. */
function int(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Liste des serveurs ICE (STUN/TURN) pour WebRTC.
 * - vide (défaut) : suffisant pour localhost et le réseau local ;
 * - liste d'URLs séparées par des virgules : `stun:stun.l.google.com:19302` ;
 * - ou JSON complet : `[{"urls":"turn:...","username":"...","credential":"..."}]`.
 */
function iceServers(value) {
  if (!value || !value.trim()) return [];
  const raw = value.trim();
  if (raw.startsWith("[")) {
    try {
      return JSON.parse(raw);
    } catch {
      console.warn("[config] ICE_SERVERS n'est pas un JSON valide, ignoré.");
      return [];
    }
  }
  return raw
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)
    .map((urls) => ({ urls }));
}

/** Origines (« https://domaine ») séparées par des virgules. */
function origins(value) {
  return (value || "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

const isProd = env.NODE_ENV === "production" || process.argv.includes("--prod");
const port = int(env.PORT, 3000);
const dataDir = path.resolve(ROOT_DIR, env.DATA_DIR || "storage");

export const config = {
  isProd,
  port,
  // Par défaut on n'écoute que sur la machine locale (aucune exposition réseau).
  host: env.HOST || "localhost",
  publicUrl: (env.PUBLIC_URL || `http://localhost:${port}`).replace(/\/+$/, ""),
  trustProxy: bool(env.TRUST_PROXY, false),
  // Site principal quand le Live tourne sur son propre sous-domaine (ex. live.daniinmigracion.com) :
  // la racine « / » y redirige, et ce site peut appeler l'API publique (bouton LIVE, inscription).
  mainSiteUrl: (env.MAIN_SITE_URL || "").replace(/\/+$/, ""),
  allowedOrigins: [...new Set([...origins(env.ALLOWED_ORIGINS), ...origins(env.MAIN_SITE_URL)])],

  // Compte administrateur créé au premier démarrage (mot de passe stocké hashé).
  admin: {
    username: env.ADMIN_USERNAME || "dani",
    password: env.ADMIN_PASSWORD || "daniinmigracion",
  },

  session: {
    cookieName: "dani_cockpit",
    ttlHours: int(env.SESSION_TTL_HOURS, 12),
    // "auto" = cookie `Secure` dès que la requête arrive en HTTPS.
    cookieSecure: (env.COOKIE_SECURE || "auto").toLowerCase(),
  },

  paths: {
    dataDir,
    database: path.join(dataDir, "dani-live.sqlite"),
    recordings: path.join(dataDir, "recordings"),
    mails: path.join(dataDir, "mails"),
    dist: path.join(ROOT_DIR, "dist"),
  },

  mail: {
    // "console" : aucun envoi réel, les emails sont affichés et sauvegardés en .eml
    // "smtp"    : envoi réel via le serveur SMTP configuré (Mailtrap, Brevo, OVH…)
    mode: (env.MAIL_MODE || "console").toLowerCase() === "smtp" ? "smtp" : "console",
    from: env.MAIL_FROM || "Dani Inmigración <no-reply@daniinmigracion.local>",
    smtp: {
      host: env.SMTP_HOST || "",
      port: int(env.SMTP_PORT, 587),
      secure: bool(env.SMTP_SECURE, false),
      user: env.SMTP_USER || "",
      pass: env.SMTP_PASS || "",
    },
    // Débit max d'emails par seconde (protège le quota du fournisseur SMTP).
    ratePerSecond: Math.max(1, int(env.MAIL_RATE_PER_SECOND, 5)),
  },

  reminders: {
    enabled: bool(env.REMINDERS_ENABLED, true),
    checkEverySeconds: Math.max(5, int(env.REMINDER_CHECK_SECONDS, 30)),
  },

  // Fuseau horaire utilisé dans les emails (le site, lui, affiche l'heure locale du visiteur).
  timezone: env.SITE_TIMEZONE || "Europe/Madrid",

  live: {
    iceServers: iceServers(env.ICE_SERVERS),
    // Relais TURN de Cloudflare (optionnel) : voir server/live/iceServers.js.
    cloudflareTurn: {
      keyId: env.CLOUDFLARE_TURN_KEY_ID || "",
      apiToken: env.CLOUDFLARE_TURN_API_TOKEN || "",
    },
    // Diffusion en "mesh" WebRTC : chaque viewer reçoit un flux direct depuis le navigateur de Dani.
    maxViewers: Math.max(1, int(env.MAX_VIEWERS, 50)),
    // Connexions simultanées max depuis une même IP publique (anti-accaparement des places).
    maxViewersPerIp: Math.max(1, int(env.MAX_VIEWERS_PER_IP, 5)),
    // Délai avant de terminer automatiquement un live dont la caméra s'est déconnectée.
    graceSeconds: int(env.LIVE_GRACE_SECONDS, 180),
    // Un live programmé non démarré est marqué "manqué" après ce délai.
    missedAfterMinutes: int(env.LIVE_MISSED_AFTER_MINUTES, 120),
  },

  geo: {
    // "ipapi" (ipapi.co, HTTPS), "ip-api" (ip-api.com, HTTP, usage non commercial) ou "none".
    provider: (env.GEO_PROVIDER || "ipapi").toLowerCase(),
  },
};
