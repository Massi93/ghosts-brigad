/**
 * Live de Dani Inmigración : transmet cette requête au Worker « dani-live »
 * (liaison de service LIVE, réglée dans Pages → Settings → Bindings).
 * Fonctionne aussi pour les WebSockets (temps réel du live).
 * Si le Worker manque ou ne répond pas, un message clair (503) remplace l'erreur Cloudflare 1101.
 */
export async function onRequest({ request, env }) {
  if (!env.LIVE) return liveDown("falta la vinculación de servicio LIVE (Pages → Settings → Bindings)");
  try {
    return await env.LIVE.fetch(request);
  } catch (err) {
    return liveDown(`el Worker « dani-live » no responde (${err?.message || err})`);
  }
}

function liveDown(reason) {
  return new Response(`Live no disponible: ${reason}.`, {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
