/**
 * Live de Dani Inmigración : transmet cette requête au Worker « dani-live »
 * (liaison de service LIVE, réglée dans Pages → Settings → Bindings).
 * Fonctionne aussi pour les WebSockets (temps réel du live).
 */
export function onRequest({ request, env }) {
  if (!env.LIVE) {
    return new Response("Live no configurado: falta la vinculación de servicio LIVE (Pages → Settings → Bindings).", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return env.LIVE.fetch(request);
}
