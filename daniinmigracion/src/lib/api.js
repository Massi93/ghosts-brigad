/**
 * Petit client HTTP pour l'API du Live (/api/live/...).
 * Les cookies de session sont envoyés automatiquement (même origine).
 */

import { translateServerMessage } from "./serverMessages";

const API_BASE = "/api/live";

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let unauthorizedHandler = null;

/** Action à exécuter quand l'API admin répond 401 (session expirée → login). */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

/** URL d'un fichier servi par l'API (ex. une vidéo enregistrée). */
export function apiFileUrl(path) {
  return `${API_BASE}${path}`;
}

/**
 * Appelle l'API et retourne le JSON. Lève `ApiError` si le statut n'est pas 2xx.
 * @param {string} path  chemin après /api/live (ex. "/admin/lives")
 * @param {{ method?: string, body?: any, signal?: AbortSignal }} [options]
 */
export async function api(path, { method = "GET", body, signal } = {}) {
  const init = {
    method,
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  };
  if (body instanceof Blob || body instanceof ArrayBuffer) {
    init.body = body;
    init.headers["Content-Type"] = "application/octet-stream";
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    // Réseau coupé : erreur lisible (status 0 = nouvel essai possible).
    throw new ApiError(0, translateServerMessage("Error de conexión"), "network");
  }
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    if (response.status === 401 && path.startsWith("/admin")) unauthorizedHandler?.();
    throw new ApiError(response.status, translateServerMessage(data.error || "Error de conexión"), data.code);
  }
  return data;
}
