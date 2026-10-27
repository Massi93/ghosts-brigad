/**
 * Messages d'erreur du serveur (écrits en espagnol) traduits en français
 * quand le cockpit est en français. Les messages inconnus restent tels quels.
 */

let lang = "es";

export function setMessagesLang(value) {
  lang = value === "fr" ? "fr" : "es";
}

const FR = {
  "Contenido demasiado grande": "Contenu trop volumineux",
  "Correo electrónico inválido": "Adresse e-mail invalide",
  "Correo no encontrado": "E-mail introuvable",
  "Demasiadas inscripciones. Inténtalo más tarde.": "Trop d'inscriptions. Réessayez plus tard.",
  "Demasiados destinatarios": "Trop de destinataires",
  "Demasiados intentos. Espera unos minutos.": "Trop de tentatives. Patientez quelques minutes.",
  "El mensaje no puede estar vacío": "Le message ne peut pas être vide",
  "Error interno del servidor": "Erreur interne du serveur",
  "Error interno": "Erreur interne",
  "Error de conexión": "Erreur de connexion",
  "El servidor no responde": "Le serveur ne répond pas",
  "Este live no se puede iniciar": "Ce live ne peut pas être démarré",
  "Este live ya terminó": "Ce live est déjà terminé",
  "Falta el título del live": "Il manque le titre du live",
  "Formato de grabación no soportado": "Format d'enregistrement non pris en charge",
  "Grabación cerrada": "Enregistrement fermé",
  "Grabación interrumpida": "Enregistrement interrompu",
  "Grabación no encontrada": "Enregistrement introuvable",
  "Identificador inválido": "Identifiant invalide",
  "Inscrito no encontrado": "Inscrit introuvable",
  "JSON inválido": "JSON invalide",
  "La fecha del live debe estar en el futuro": "La date du live doit être dans le futur",
  "La fecha es demasiado lejana": "La date est trop lointaine",
  "La grabación sigue en curso": "L'enregistrement est encore en cours",
  "Live inválido": "Live invalide",
  "Live programado no encontrado": "Live programmé introuvable",
  "Método no permitido": "Méthode non autorisée",
  "No autorizado": "Non autorisé",
  "No encontrado": "Introuvable",
  "No hay ningún live en curso": "Aucun live en cours",
  "No hay un live en curso": "Aucun live en cours",
  "No se pudo escribir la grabación": "Impossible d'écrire l'enregistrement",
  "Origen no permitido": "Origine non autorisée",
  "Secuencia inválida": "Séquence invalide",
  "Selecciona al menos un destinatario": "Sélectionnez au moins un destinataire",
  "Servidor ocupado, inténtalo de nuevo.": "Serveur occupé, réessayez.",
  "Texto demasiado largo": "Texte trop long",
  "Texto inválido": "Texte invalide",
  "Título inválido": "Titre invalide",
  "Usuario o contraseña incorrectos": "Identifiant ou mot de passe incorrect",
  "Ya hay un live en curso": "Un live est déjà en cours",
  "Ya se está transmitiendo desde otra pestaña": "La diffusion se fait déjà depuis un autre onglet",
  // Messages du navigateur (caméra, enregistrement)
  "Permiso denegado: autoriza la cámara y el micrófono en el navegador.":
    "Permission refusée : autorisez la caméra et le micro dans le navigateur.",
  "No se encontró ninguna cámara o micrófono.": "Aucune caméra ni aucun micro trouvé.",
  "La cámara o el micrófono ya están en uso por otra aplicación.":
    "La caméra ou le micro est déjà utilisé par une autre application.",
  "No se pudo acceder a la cámara.": "Impossible d'accéder à la caméra.",
  "La cámara solo funciona en https:// o en http://localhost.": "La caméra ne fonctionne qu'en https:// ou sur http://localhost.",
  "Este navegador no permite grabar el live": "Ce navigateur ne permet pas d'enregistrer le live",
  "Error de grabación": "Erreur d'enregistrement",
  "No se pudo subir el final de la grabación": "Impossible d'envoyer la fin de l'enregistrement",
};

const FR_PATTERNS = [
  [/^Campo inválido: (.+)$/, (m) => `Champ invalide : ${m[1]}`],
  [/^Fecha inválida: (.+)$/, (m) => `Date invalide : ${m[1]}`],
  [/^Fragmento fuera de orden \(esperado (\d+)\)$/, (m) => `Morceau hors séquence (attendu ${m[1]})`],
  [/^No se pudo enviar: (.+)$/, (m) => `Envoi impossible : ${m[1]}`],
];

/** Traduit un message du serveur dans la langue du cockpit. */
export function translateServerMessage(message) {
  if (lang !== "fr" || typeof message !== "string") return message;
  if (FR[message]) return FR[message];
  for (const [re, fn] of FR_PATTERNS) {
    const m = message.match(re);
    if (m) return fn(m);
  }
  return message;
}
