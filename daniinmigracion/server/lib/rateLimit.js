/**
 * Limiteur de débit en mémoire (fenêtre fixe par clé, ex. une IP).
 * Suffisant pour un serveur unique en local ; aucune dépendance externe.
 */
export function createRateLimiter({ max, windowMs }) {
  const hits = new Map();

  // Nettoyage périodique pour ne pas garder les anciennes clés en mémoire.
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.start > windowMs) hits.delete(key);
    }
  }, windowMs);
  timer.unref();

  return {
    /** Retourne `true` si la clé a dépassé la limite (sans incrémenter). */
    isBlocked(key) {
      const entry = hits.get(key);
      if (!entry || Date.now() - entry.start > windowMs) return false;
      return entry.count >= max;
    },
    /** Comptabilise un essai pour la clé. */
    hit(key) {
      const now = Date.now();
      const entry = hits.get(key);
      if (!entry || now - entry.start > windowMs) {
        hits.set(key, { count: 1, start: now });
      } else {
        entry.count += 1;
      }
    },
    /** Remet le compteur à zéro (ex. après un login réussi). */
    reset(key) {
      hits.delete(key);
    },
  };
}
