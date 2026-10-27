/**
 * Routes d'authentification : /api/live/auth/login, /logout, /me
 */
import { verifyCredentials } from "./password.js";
import { clearSessionCookie, createSession, deleteSession, sessionCookie } from "./sessions.js";
import { createRateLimiter } from "../lib/rateLimit.js";
import { json } from "../lib/http.js";

// 5 essais max par IP sur 15 minutes (protection contre le brute-force).
const loginLimiter = createRateLimiter({ max: 5, windowMs: 15 * 60_000 });
// Le calcul du hash occupe le processeur : on limite les vérifications simultanées.
const MAX_LOGINS_IN_FLIGHT = 4;
let loginsInFlight = 0;

/**
 * @param {import("../lib/http.js").createRouter} router
 * @param {{ onLogout: (tokenHash: string) => void }} hooks
 *   `onLogout` permet de couper les WebSockets de la session fermée.
 */
export function registerAuthRoutes(router, { onLogout }) {
  router.add("POST", "/auth/login", async ({ request, ip, body }) => {
    if (loginLimiter.isBlocked(ip)) {
      return json({ error: "Demasiados intentos. Espera unos minutos.", code: "too_many_attempts" }, 429);
    }
    if (loginsInFlight >= MAX_LOGINS_IN_FLIGHT) {
      return json({ error: "Servidor ocupado, inténtalo de nuevo.", code: "busy" }, 429);
    }

    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    // L'essai est compté AVANT la vérification : des requêtes parallèles ne
    // peuvent pas contourner la limite. Le compteur est remis à zéro si c'est le bon.
    loginLimiter.hit(ip);
    loginsInFlight += 1;
    let admin = null;
    try {
      if (username && password && password.length <= 200) {
        admin = await verifyCredentials(username, password);
      }
    } finally {
      loginsInFlight -= 1;
    }

    if (!admin) {
      return json({ error: "Usuario o contraseña incorrectos", code: "bad_credentials" }, 401);
    }

    loginLimiter.reset(ip);
    const token = await createSession(admin.username, {
      ip,
      userAgent: request.headers.get("user-agent"),
    });
    return json({ admin: { username: admin.username } }, 200, { "Set-Cookie": sessionCookie(request, token) });
  });

  router.add("POST", "/auth/logout", ({ request, session }) => {
    if (session) {
      deleteSession(session.tokenHash);
      onLogout(session.tokenHash);
    }
    return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(request) });
  });

  router.add("GET", "/auth/me", ({ session }) => {
    if (!session) return json({ error: "No autorizado", code: "unauthorized" }, 401);
    return json({ admin: { username: session.admin.username } });
  });
}
