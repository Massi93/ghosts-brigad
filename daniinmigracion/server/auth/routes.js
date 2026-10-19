/**
 * Routes d'authentification : /api/auth/login, /logout, /me
 */
import { Router } from "express";
import { verifyCredentials } from "./admins.js";
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  setSessionCookie,
} from "./sessions.js";
import { createRateLimiter } from "../lib/rateLimit.js";
import { clientIp } from "../lib/http.js";

// 5 échecs max par IP sur 15 minutes (protection contre le brute-force).
const loginLimiter = createRateLimiter({ max: 5, windowMs: 15 * 60_000 });

/**
 * @param {{ onLogout: (tokenHash: string) => void }} hooks
 *   `onLogout` permet de couper les WebSockets de la session fermée.
 */
export function authRouter({ onLogout }) {
  const router = Router();

  router.post("/login", async (req, res) => {
    const ip = clientIp(req);
    if (loginLimiter.isBlocked(ip)) {
      return res.status(429).json({
        error: "Demasiados intentos. Espera unos minutos.",
        code: "too_many_attempts",
      });
    }

    const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const admin =
      username && password && password.length <= 200
        ? await verifyCredentials(username, password)
        : null;

    if (!admin) {
      loginLimiter.hit(ip);
      return res
        .status(401)
        .json({ error: "Usuario o contraseña incorrectos", code: "bad_credentials" });
    }

    loginLimiter.reset(ip);
    const token = createSession(admin.id, { ip, userAgent: req.headers["user-agent"] });
    setSessionCookie(req, res, token);
    res.json({ admin: { username: admin.username } });
  });

  router.post("/logout", (req, res) => {
    if (req.session) {
      deleteSession(req.session.tokenHash);
      onLogout(req.session.tokenHash);
    }
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  router.get("/me", (req, res) => {
    if (!req.session) return res.status(401).json({ error: "No autorizado", code: "unauthorized" });
    res.json({ admin: { username: req.session.admin.username } });
  });

  return router;
}
