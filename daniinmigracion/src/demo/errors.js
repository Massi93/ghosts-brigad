/** Erreur d'API simulée (même forme que celle de src/lib/api.js). */
export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
