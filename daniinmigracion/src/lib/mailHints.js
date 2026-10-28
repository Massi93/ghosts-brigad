/**
 * Explication et solution pour les erreurs d'envoi courantes (Brevo, Gmail, SMTP).
 * Retourne `null` si l'erreur n'est pas reconnue.
 * @param {string} error message renvoyé par le fournisseur
 * @param {(es: string, fr: string) => string} t traduction du cockpit
 */
export function mailErrorHint(error, t) {
  const e = String(error || "");
  if (/unrecogni[sz]ed IP|authori[sz]ed[_ ]ips|IP address/i.test(e)) {
    return t(
      "Brevo bloquea las IP desconocidas: Brevo → Seguridad → IP autorizadas → desactivar el bloqueo (Cloudflare usa muchas IP).",
      "Brevo bloque les adresses IP inconnues : Brevo → Sécurité → Adresses IP autorisées → désactiver le blocage (Cloudflare utilise de nombreuses IP)."
    );
  }
  if (/not authori[sz]ed for resource|permission/i.test(e)) {
    return t(
      "La clave API no tiene el permiso « Emails transaccionales »: en Brevo → SMTP y API → Claves API, crea una clave con ese permiso (o acceso completo) y ejecuta npm run mail:setup.",
      "La clé API n'a pas la permission « E-mails transactionnels » : Brevo → SMTP et API → Clés API → créez une clé avec cette permission (ou accès complet), puis relancez npm run mail:setup."
    );
  }
  if (/key not found|api[- ]?key|unauthori[sz]ed|invalid.*key/i.test(e)) {
    return t(
      "Clave de Brevo inválida o borrada: crea una nueva clave API y ejecuta otra vez npm run mail:setup.",
      "Clé Brevo invalide ou supprimée : créez une nouvelle clé API puis relancez npm run mail:setup."
    );
  }
  if (/not (yet )?activated|account.*(activat|suspend|valid)|permission_denied/i.test(e)) {
    return t(
      "Tu cuenta Brevo aún no puede enviar correos transaccionales: completa tu perfil o contacta con el soporte de Brevo.",
      "Votre compte Brevo ne peut pas encore envoyer d'e-mails transactionnels : complétez le profil ou contactez le support Brevo."
    );
  }
  if (/sender/i.test(e)) {
    return t(
      "Remitente no válido: en Brevo → Remitentes, live@daniinmigracion.com debe estar « Verificado ».",
      "Expéditeur refusé : dans Brevo → Expéditeurs, live@daniinmigracion.com doit être « Vérifié »."
    );
  }
  if (/535|auth|credentials|password/i.test(e)) {
    return t(
      "Usuario o contraseña SMTP rechazados: ejecuta otra vez npm run mail:setup.",
      "Identifiant ou mot de passe SMTP refusé : relancez npm run mail:setup."
    );
  }
  return null;
}
