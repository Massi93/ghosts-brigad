# Politique de confidentialité — FitFlow

**Dernière mise à jour : 2026-06-26**

> ⚠️ Ce document est un **modèle de référence**. Avant publication sur les
> stores, fais-le relire par un juriste ou un service spécialisé (iubenda,
> Termly, etc.) en l'adaptant à ton organisation et tes traitements réels.
> Remplace ensuite l'URL `https://fitflow.app/privacy` dans
> `lib/core/constants/app_constants.dart` par l'URL de cette politique
> publiée.

## 1. Qui sommes-nous (responsable du traitement)

L'application **FitFlow** est éditée par **[Nom de l'éditeur]**, [forme juridique],
immatriculée sous le numéro **[SIREN/Registre]**, dont le siège est à
**[Adresse complète]**.

Contact : `support@fitflow.app` — Délégué à la protection des données
(si désigné) : `dpo@fitflow.app`.

## 2. Quelles données nous traitons

| Catégorie | Données concrètes | Origine |
|---|---|---|
| **Identité** | Prénom, nom, e-mail, âge, numéro de téléphone | Tu nous les fournis à l'inscription |
| **Authentification** | UID Firebase, jeton de session | Fournisseur d'auth (Firebase / Google / Apple) |
| **Données de santé liées au fitness** | Poids, taille, IMC calculé, objectif, niveau, séances réalisées, calories estimées | Tu nous les fournis ou elles sont calculées à partir de tes saisies |
| **Activité dans l'app** | Repas loggés, points, badges, séries quotidiennes, défis | Générées par ton usage |
| **Conversations avec le coach IA** | Messages que tu lui envoies et ses réponses | Tu les produis |
| **Achats** | Statut d'abonnement Premium (sans donnée bancaire — gérée par la boutique App Store / Play Store ou Stripe) | Plateforme de paiement |
| **Techniques** | Logs d'erreur anonymisés (si activés), version d'app, OS | Automatique |

Nous **ne** traitons **pas** : adresse postale précise, coordonnées
bancaires (gérées par les plateformes), données biométriques.

## 3. Pourquoi (finalités) et sur quelle base légale (RGPD)

| Finalité | Base légale |
|---|---|
| Te créer un compte et te connecter | Exécution du contrat (Art. 6.1.b RGPD) |
| Te fournir un coaching personnalisé (calcul IMC, calories, conseils IA) | Exécution du contrat + consentement explicite pour les données de santé (Art. 9.2.a) |
| Gérer ton abonnement Premium | Exécution du contrat |
| Te contacter (support, réinitialisation de mot de passe) | Exécution du contrat |
| Améliorer la qualité du service (statistiques agrégées) | Intérêt légitime (Art. 6.1.f) |
| Respecter nos obligations légales (comptabilité, fiscalité) | Obligation légale (Art. 6.1.c) |

## 4. Combien de temps on conserve tes données

- **Profil & données de fitness** : tant que ton compte est actif, et 30
  jours après ta demande de suppression (sauvegardes).
- **Logs techniques** : 13 mois max.
- **Données comptables** liées à un abonnement : 10 ans (obligation fiscale FR).
- **Conversations avec le coach IA** : tant que ton compte est actif (tu peux
  les effacer manuellement depuis l'app).

## 5. Qui voit tes données (sous-traitants)

Nous travaillons avec des sous-traitants soumis à des accords de protection
des données :

| Sous-traitant | Rôle | Lieu de traitement |
|---|---|---|
| **Google Cloud / Firebase** | Hébergement, authentification, base de données | Europe (région `europe-west1`) |
| **OpenAI** (si configuré) | Génération des réponses du coach IA | États-Unis — clauses contractuelles types et DPA OpenAI |
| **RevenueCat** (si configuré) | Gestion des abonnements | États-Unis — clauses contractuelles types |
| **Apple / Google** | Paiements in-app, distribution sur les stores | États-Unis — selon leurs propres politiques |

Nous **ne vendons jamais** tes données à des tiers et **ne faisons aucune
publicité** dans l'app.

## 6. Transferts hors de l'UE

Quand un sous-traitant traite des données aux États-Unis, le transfert est
encadré par les **clauses contractuelles types** de la Commission
européenne, et le sous-traitant adhère au **Data Privacy Framework** quand
c'est disponible.

## 7. Tes droits (RGPD)

Tu peux à tout moment :

- **Accéder** à tes données — bouton « Exporter mes données » dans Profil → Confidentialité.
- **Rectifier** tes données — modifie ton profil directement.
- **Supprimer** ton compte et toutes tes données — bouton « Supprimer mon compte ».
- **Retirer ton consentement** — supprime ton compte ou contacte-nous.
- **Limiter** ou **t'opposer** à un traitement — écris à `support@fitflow.app`.
- **Portabilité** — l'export ci-dessus est au format JSON standard.
- **Déposer une réclamation** auprès de la CNIL (en France) ou de l'autorité
  équivalente de ton pays.

Délai de réponse à toute demande : **1 mois maximum**.

## 8. Sécurité

- Connexions chiffrées HTTPS / TLS.
- Authentification par Firebase Auth, avec règles d'accès Firestore strictes
  (chaque utilisateur ne lit / écrit que son propre document).
- Les clés API sensibles (OpenAI) ne sont **jamais** stockées dans
  l'application — elles vivent côté serveur via Cloud Functions.
- Sauvegardes chiffrées par notre hébergeur.

## 9. Mineurs

FitFlow est destiné aux personnes de **15 ans et plus** (limite européenne
abaissée à 13 ans dans certains pays). Si tu as moins de 15 ans, demande
l'autorisation de tes parents avant de t'inscrire.

## 10. Modifications

Nous t'informerons via l'app ou par e-mail de toute modification
significative de cette politique. La poursuite de l'usage vaut acceptation
des modifications mineures.

## 11. Comment nous contacter

Pour toute question : `support@fitflow.app`.
