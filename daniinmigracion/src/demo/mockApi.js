/**
 * Remplace src/lib/api.js dans la démo : même interface, réponses fournies par
 * le serveur simulé (demoServer.js) au lieu du réseau.
 */
import { ApiError } from "./errors.js";
import { fileUrl, handleApi } from "./demoServer.js";

export { ApiError };

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export function apiFileUrl(path) {
  return fileUrl(path);
}

export async function api(path, { method = "GET", body } = {}) {
  // Petit délai pour reproduire un aller-retour réseau.
  await new Promise((r) => setTimeout(r, 60 + Math.random() * 120));
  try {
    const data = await handleApi(method, path, body);
    return JSON.parse(JSON.stringify(data ?? {}));
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401 && path.startsWith("/admin")) unauthorizedHandler?.();
      throw err;
    }
    console.error("[démo] Erreur inattendue :", err);
    throw new ApiError(500, "Error interno del servidor");
  }
}
