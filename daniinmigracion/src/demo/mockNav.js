/**
 * Navigation de la démo : les « pages » (/, /live, /cockpit) changent sans
 * recharger le document, car la démo tourne dans une seule page.
 * Remplace src/lib/nav.js dans le build de démonstration.
 */
let route = { path: "/", search: "" };
const listeners = new Set();

export const currentPath = () => route.path;
export const currentSearch = () => route.search;

export function navigate(url) {
  const target = new URL(url, "https://demo.local");
  route = { path: target.pathname, search: target.search };
  listeners.forEach((fn) => fn(route));

  // Ancre éventuelle (/#proximo-live) : défilement une fois la page affichée.
  const hash = target.hash.slice(1);
  if (hash) {
    setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" }), 150);
  } else {
    window.scrollTo({ top: 0 });
  }
}

/** Abonnement aux changements de page (utilisé par la racine de la démo). */
export function subscribeRoute(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
