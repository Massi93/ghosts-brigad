/**
 * Émetteur d'événements minimal (équivalent de `EventEmitter` de Node).
 */
export class Emitter {
  #listeners = new Map();

  on(event, fn) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(fn);
    return this;
  }

  off(event, fn) {
    this.#listeners.get(event)?.delete(fn);
    return this;
  }

  emit(event, ...args) {
    for (const fn of [...(this.#listeners.get(event) ?? [])]) {
      try {
        fn(...args);
      } catch (err) {
        console.error(`[events] Erreur dans « ${event} » :`, err?.stack || err);
      }
    }
  }

  removeAll() {
    this.#listeners.clear();
  }
}
