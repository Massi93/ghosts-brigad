/**
 * Point d'entrée du Worker « dani-live » (Cloudflare).
 *
 * Le site www.daniinmigracion.com (Cloudflare Pages) transmet à ce Worker
 * les chemins du Live (voir site-integration/) :
 *   /live            page des viewers
 *   /live/…          fichiers de l'application (JS, CSS, widget.js du site)
 *   /cockpit…        tableau de bord de Dani (protégé par mot de passe)
 *   /api/live/…      API + WebSocket, traités par le Durable Object LiveHub
 *
 * En local : `npm run dev` → http://localhost:8787
 */
import { SECURITY_HEADERS } from "./lib/http.js";

export { LiveHub } from "./LiveHub.js";

/** L'unique instance du Durable Object (toutes les données du Live). */
function hub(env) {
  return env.LIVE_HUB.get(env.LIVE_HUB.idFromName("main"));
}

/** Ajoute les en-têtes de sécurité et de cache à une réponse. */
function decorate(response, extra = {}) {
  const copy = new Response(response.body, response);
  for (const [key, value] of Object.entries({ ...SECURITY_HEADERS, ...extra })) copy.headers.set(key, value);
  return copy;
}

/** Page de l'application (le routage /live, /cockpit… se fait dans le navigateur). */
async function appShell(request, env, { noStore = false } = {}) {
  const response = await env.ASSETS.fetch(new Request(new URL("/live/index.html", request.url)));
  if (!response.ok) return new Response("Aplicación no compilada: npm run build", { status: 500 });
  return decorate(response, { "Cache-Control": noStore ? "no-store" : "no-cache" });
}

function redirect(location, status = 302) {
  return new Response(null, { status, headers: { Location: location, "Cache-Control": "no-store" } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // API et WebSocket : tout est traité par le Durable Object.
    if (path === "/api/live" || path.startsWith("/api/live/")) {
      return hub(env).fetch(request);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Método no permitido", { status: 405 });
    }

    // Page des viewers.
    if (path === "/live" || path === "/live/") return appShell(request, env);

    // Cockpit : redirection vers /cockpit/login si la session est absente.
    if (path === "/cockpit" || path.startsWith("/cockpit/")) {
      const clean = path.replace(/\/+$/, "") || "/";
      const loggedIn = await hub(env).isLoggedIn(request.headers.get("cookie"));
      const isLoginPage = clean === "/cockpit/login";
      if (isLoginPage && loggedIn) return redirect("/cockpit");
      if (!isLoginPage && !loggedIn) {
        return redirect(`/cockpit/login?next=${encodeURIComponent(path + url.search)}`);
      }
      return appShell(request, env, { noStore: true });
    }

    // Fichiers de l'application (noms avec empreinte → cache long).
    if (path.startsWith("/live/")) {
      const response = await env.ASSETS.fetch(request);
      if (!response.ok) return decorate(response);
      const immutable = path.startsWith("/live/assets/");
      return decorate(response, {
        "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=300",
      });
    }

    // Accès direct au Worker (adresse *.workers.dev) : la page d'accueil est celle du site.
    if (path === "/" && env.PUBLIC_URL && new URL(env.PUBLIC_URL).host !== url.host) {
      return redirect(`${env.PUBLIC_URL.replace(/\/+$/, "")}/`);
    }
    // En local : maquette du site (src/App.jsx) pour tester le bouton LIVE et l'inscription.
    if (path === "/") return appShell(request, env);

    return new Response("No encontrado", { status: 404 });
  },

  /** Filet de sécurité (cron) : relance le réveil du Durable Object. */
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(hub(env).tick());
  },
};
