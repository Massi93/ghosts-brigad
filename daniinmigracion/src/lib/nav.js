/**
 * Navigation entre les pages (site, /live, /cockpit).
 * Centralisée ici pour que la version de démonstration (src/demo/) puisse la remplacer.
 */

export const currentPath = () => window.location.pathname;

export const currentSearch = () => window.location.search;

/** Ouvre une page du site (rechargement complet). */
export function navigate(url, { replace = false } = {}) {
  if (replace) window.location.replace(url);
  else window.location.assign(url);
}
