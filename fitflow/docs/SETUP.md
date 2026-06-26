# Configuration — FitFlow

Ce guide explique comment configurer les clés API, le backend, le contenu vidéo,
l'authentification et les paiements. **Par défaut, rien de tout cela n'est
nécessaire** : l'app tourne en mode démo hors-ligne. Active les briques au fur et
à mesure.

---

## 0. Pré-requis

- Flutter SDK ≥ 3.19 — vérifie avec `flutter doctor`.
- Xcode (build iOS) / Android Studio + SDK (build Android).
- Un éditeur (VS Code / Android Studio).

```bash
cd fitflow
flutter create . --platforms=ios,android,web   # génère les runners natifs
flutter pub get
```

---

## 1. Clés & secrets — `--dart-define`

Les secrets ne sont **jamais** stockés en dur dans le code. Ils sont injectés au
build via `--dart-define` et lus dans `lib/core/constants/env.dart`.

| Variable | Rôle | Défaut |
|---|---|---|
| `OPENAI_API_KEY` | Active le coach IA OpenAI | *(vide → moteur hors-ligne)* |
| `OPENAI_MODEL` | Modèle de chat | `gpt-4o-mini` |
| `API_BASE_URL` | Backend REST (Node.js) optionnel | *(vide → contenu local)* |
| `REVENUECAT_KEY` | Clé publique RevenueCat (abonnements) | *(vide → achat simulé)* |

### En développement

```bash
flutter run \
  --dart-define=OPENAI_API_KEY=sk-proj-xxxx \
  --dart-define=REVENUECAT_KEY=appl_xxxx
```

### En CI / build de release — fichier de defines

Crée `dart_defines.json` (à **git-ignorer**) :

```json
{
  "OPENAI_API_KEY": "sk-proj-xxxx",
  "OPENAI_MODEL": "gpt-4o-mini",
  "REVENUECAT_KEY": "appl_xxxx",
  "API_BASE_URL": "https://api.fitflow.app"
}
```

```bash
flutter build appbundle --dart-define-from-file=dart_defines.json
flutter build ipa       --dart-define-from-file=dart_defines.json
```

---

## 2. Coach IA (OpenAI)

1. Crée une clé sur <https://platform.openai.com/api-keys>.
2. Passe-la via `--dart-define=OPENAI_API_KEY=...`.
3. Le prompt système est construit dans
   `lib/services/ai_coach_service.dart > buildSystemPrompt()` et conditionne le
   coach sur le **niveau**, **l'objectif**, l'âge, le poids et l'IMC de
   l'utilisateur. Adapte-le librement.

> 🔒 **Sécurité production :** pour ne pas exposer la clé OpenAI dans le binaire
> mobile, route les appels via **ton backend** (proxy). Mets `API_BASE_URL` et
> remplace l'appel direct dans `AiCoachService.sendMessage()` par un appel à
> `POST $API_BASE_URL/coach`. Garde la clé OpenAI côté serveur uniquement.

Sans clé, le coach utilise un moteur de secours intégré (routage par mots-clés
adapté au niveau) — pratique pour la démo et le tier gratuit.

---

## 3. Contenu vidéo & catalogue

Le catalogue (exercices, programmes, plans nutrition, produits) vit dans
`lib/data/` et est servi par `ContentService`. Les URLs vidéo pointent vers des
flux d'exemple publics — **remplace-les par ton CDN**.

Pour gérer le contenu **sans republier l'app** :

1. Mets `API_BASE_URL` vers ton backend.
2. Dans `ContentService.getExercises()` / `getPrograms()` / etc., remplace le
   retour des données mock par un `GET $API_BASE_URL/exercises` (le décodage
   JSON est déjà prévu via `Exercise.fromJson`, `WorkoutProgram.fromJson`…).
3. Héberge tes vidéos courtes en **HLS** ou **mp4** sur un CDN
   (Cloudflare Stream, Mux, S3 + CloudFront). Le lecteur `chewie`/`video_player`
   accepte les deux.

Schéma minimal d'un exercice côté backend → voir `Exercise.toJson()`.

---

## 4. Authentification

L'implémentation par défaut (`AuthService`) est **locale** (persistance device)
pour permettre une démo sans backend. Pour une auth réelle et sécurisée :

### Option A — Firebase Auth (le plus simple)

```bash
flutter pub add firebase_core firebase_auth google_sign_in sign_in_with_apple
flutterfire configure   # génère firebase_options.dart + fichiers natifs
```

Puis crée un `FirebaseAuthService implements AuthService`-like et remplace
l'instance dans `main.dart`. Email/password, Google et Apple sont supportés.

### Option B — Backend REST + JWT

Implémente `signUp`/`signIn` en appelant `POST $API_BASE_URL/auth/*`, stocke le
JWT dans `flutter_secure_storage`, et envoie l'en-tête `Authorization: Bearer`.

> Les boutons « Google » / « Apple » de l'écran de login appellent déjà
> `signInWithProvider('google'|'apple')` — branche-les sur le SDK choisi.

---

## 5. Paiements & abonnements

### Abonnement Premium (4,99 €/mois) — RevenueCat (recommandé)

RevenueCat unifie StoreKit (iOS) et Google Play Billing.

```bash
flutter pub add purchases_flutter
```

1. Crée l'app + l'entitlement `premium` + le produit `fitflow_premium_monthly`
   (id défini dans `AppConstants.premiumProductId`) sur RevenueCat, App Store
   Connect et Google Play Console.
2. Configure RevenueCat au démarrage et implémente l'achat dans
   `SubscriptionService.purchasePremium()` :

```dart
await Purchases.configure(PurchasesConfiguration(Env.revenueCatKey));
final offerings = await Purchases.getOfferings();
final info = await Purchases.purchasePackage(
  offerings.current!.monthly!,
);
final premium = info.entitlements.active.containsKey('premium');
```

Le reste de l'app ne dépend que de `SubscriptionService.isPremium`, donc la
bascule est isolée à ce fichier.

### Boutique (produits physiques) — Stripe

Les produits physiques ne passent **pas** par l'IAP des stores : utilise
**Stripe**. Implémente `ShopProvider.checkout()` avec `flutter_stripe`
(`Stripe.instance.confirmPayment`) et crée la commande côté serveur (PaymentIntent).

---

## 6. Récapitulatif des branchements

| Brique | Fichier à éditer | Statut par défaut |
|---|---|---|
| Coach IA | `services/ai_coach_service.dart` | Hors-ligne |
| Contenu | `services/content_service.dart` | Mock local |
| Auth | `services/auth_service.dart` | Local |
| Abonnement | `services/subscription_service.dart` | Simulé |
| Boutique/paiement | `providers/shop_provider.dart` | Simulé |
| Persistance | `services/storage_service.dart` | shared_preferences |

Tout est conçu pour être remplacé sans toucher aux écrans (`features/`).
