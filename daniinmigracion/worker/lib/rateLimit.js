/**
 * Limiteur de débit en mémoire (fenêtre fixe par clé, ex. une IP).
 * Le Durable Object est unique : toutes les requêtes passent par la même mémoire.
 */
export function createRateLimiter({ max, windowMs }) {
  const hits = new Map();

  /** Nettoyage paresseux des anciennes clés (pas de minuteur permanent). */
  function prune(now) {
    if (hits.size < 1000) return;
    for (const [key, entry] of hits) {
      if (now - entry.start > windowMs) hits.delete(key);
    }
  }

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
      prune(now);
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
