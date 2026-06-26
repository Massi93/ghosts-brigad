# FitFlow — Cloud Functions

Backend serverless (Firebase Functions 2ᵉ gen, Node 20) qui :

1. **`coach`** — proxy sécurisé vers OpenAI : la clé API reste **côté serveur**,
   jamais embarquée dans l'app mobile.
2. **`revenuecatWebhook`** — met à jour l'entitlement Premium de l'utilisateur
   dans Firestore (`users/{uid}.premium`) à partir des événements RevenueCat.

## Prérequis

- Un projet Firebase configuré (`flutterfire configure`, voir `../docs/FIREBASE.md`).
- Plan **Blaze** (les fonctions sortantes vers OpenAI nécessitent la facturation).
- `npm install -g firebase-tools` puis `firebase login`.

## Configurer les secrets (une fois)

```bash
cd functions
npm install
firebase functions:secrets:set OPENAI_API_KEY            # colle ta clé OpenAI
firebase functions:secrets:set REVENUECAT_WEBHOOK_SECRET # un secret de ton choix
```

## Déployer

```bash
firebase deploy --only functions
# Tu obtiens des URLs du type :
#   https://europe-west1-<projet>.cloudfunctions.net/coach
#   https://europe-west1-<projet>.cloudfunctions.net/revenuecatWebhook
```

## Brancher l'app

Lance l'app en pointant `API_BASE_URL` sur la base des fonctions :

```bash
flutter run \
  --dart-define=USE_FIREBASE=true \
  --dart-define=API_BASE_URL=https://europe-west1-<projet>.cloudfunctions.net
```

`AiCoachService` appellera alors `POST $API_BASE_URL/coach` (sans clé) au lieu
d'OpenAI en direct. Sans `API_BASE_URL`, l'app garde son comportement actuel
(OpenAI direct si clé fournie, sinon moteur hors-ligne).

## Configurer le webhook RevenueCat

Dans le dashboard RevenueCat → **Integrations → Webhooks** :
- URL : `https://europe-west1-<projet>.cloudfunctions.net/revenuecatWebhook`
- En-tête `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`

La fonction écrit `premium: true/false` dans `users/{app_user_id}`. Pense à
définir l'`app_user_id` RevenueCat = l'UID Firebase à la connexion
(`Purchases.logIn(uid)`), pour que l'entitlement retombe sur le bon document.

## Émulateur local

```bash
firebase emulators:start --only functions
```

## Tests

Ce dossier n'est pas couvert par la CI Flutter (code Node). Pour le tester,
utilise l'émulateur Firebase ou ajoute des tests Jest selon tes besoins.
