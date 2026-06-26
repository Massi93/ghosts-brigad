# Architecture — FitFlow

## Vue d'ensemble

FitFlow suit une architecture **en couches** simple et testable, avec une
séparation nette entre l'UI, l'état, la logique métier et les données.

```
┌─────────────────────────────────────────────┐
│  features/  (UI — écrans & widgets par feature)│
└───────────────┬─────────────────────────────┘
                │  watch / read (Provider)
┌───────────────▼─────────────────────────────┐
│  providers/  (état — ChangeNotifier)          │
└───────────────┬─────────────────────────────┘
                │  appelle
┌───────────────▼─────────────────────────────┐
│  services/  (logique : IA, auth, contenu, …)  │
└───────────────┬─────────────────────────────┘
                │  lit / écrit
┌───────────────▼─────────────────────────────┐
│  data/ (catalogue) + StorageService (local)   │
│  ▸ remplaçables par un backend distant        │
└─────────────────────────────────────────────┘
                │
         models/ (objets immuables + JSON)
```

### Principes

1. **Les écrans ne connaissent jamais la source des données.** Ils parlent à des
   providers ; les providers parlent à des services ; les services décident
   d'utiliser le local ou un backend distant.
2. **Tout est branchable.** Chaque service (IA, auth, abonnement, contenu) a une
   implémentation locale par défaut, remplaçable sans toucher à l'UI.
3. **Dégradation gracieuse.** Pas de clé OpenAI → coach hors-ligne. Pas de
   backend → catalogue intégré. L'app est toujours utilisable.

---

## Couches

### `models/`
Objets de données immuables avec `toJson` / `fromJson`. Contiennent aussi la
logique métier « pure » (ex. `UserProfile.bmi`, `estimatedDailyCalories`,
`GamificationState.level`).

### `services/`
| Service | Responsabilité | Remplacement prod |
|---|---|---|
| `StorageService` | Persistance clé/valeur (shared_preferences) | API REST / Firestore |
| `AiCoachService` | Appel OpenAI + prompt + fallback | Proxy backend |
| `AuthService` | Sessions & profil | Firebase Auth / JWT |
| `SubscriptionService` | Entitlement Premium | RevenueCat |
| `ContentService` | Catalogue (exos, programmes, nutrition, shop) | Backend + CDN |

### `providers/`
Un `ChangeNotifier` par domaine : `UserProvider`, `WorkoutProvider`,
`NutritionProvider`, `ProgressProvider`, `CoachProvider`, `ShopProvider`,
`GamificationProvider`. Injectés en haut de l'arbre dans `main.dart` via
`MultiProvider`.

### `features/`
Un dossier par fonctionnalité, chacun contenant ses écrans. `AuthGate` route
entre login → onboarding → `RootShell` (les 5 onglets).

---

## Modèle freemium

Centralisé dans `AppConstants` et appliqué dans les providers :

- `freeExerciseLimit = 5` → `WorkoutProvider.accessibleExercises()`.
- `freeCoachMessagesPerDay = 5` → `CoachProvider.remainingFor()`.
- Programmes / plans `isPremium` filtrés selon `UserProvider.isPremium`.
- `PaywallSheet` déclenche l'achat via `SubscriptionService`.

---

## Brancher un backend (Node.js + PostgreSQL)

Le sujet mentionne **PostgreSQL** pour profils, progression et historique. Schéma
recommandé (les `toJson()` des modèles donnent directement les colonnes) :

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT, email TEXT UNIQUE,
  age INT, height_cm REAL, weight_kg REAL,
  level SMALLINT, goal SMALLINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE exercises (
  id TEXT PRIMARY KEY, name TEXT, description TEXT,
  muscle_group SMALLINT, level SMALLINT,
  video_url TEXT, thumbnail_url TEXT,
  default_sets INT, default_reps INT,
  estimated_calories INT, is_premium BOOLEAN
);

CREATE TABLE programs ( ... );          -- + table de jointure program_exercises
CREATE TABLE nutrition_plans ( ... );    -- + table meals
CREATE TABLE progress_entries (
  id UUID PRIMARY KEY, user_id UUID REFERENCES users(id),
  date TIMESTAMPTZ, weight_kg REAL, body_fat_pct REAL,
  workouts_completed INT, calories_burned INT
);
CREATE TABLE products ( ... );
CREATE TABLE orders ( ... );
```

API REST minimale (Express/Fastify) :

```
POST /auth/signup            GET  /exercises
POST /auth/login             GET  /programs
GET  /me                     GET  /nutrition-plans
PUT  /me                     GET  /products
GET  /progress  POST /progress
POST /coach            ← proxy OpenAI (garde la clé côté serveur)
POST /orders           ← crée un PaymentIntent Stripe
POST /webhooks/revenuecat   ← met à jour l'entitlement Premium
```

Pour activer : mets `API_BASE_URL`, puis remplace les retours mock dans
`ContentService` et la persistance dans les services par des appels `http`. Les
`fromJson` existent déjà.

### Alternative Firebase (« le plus simple »)
- **Auth** : Firebase Auth (email + Google/Apple).
- **Données** : Firestore (collections `users`, `progress`, `exercises`…).
- **Vidéos** : Firebase Storage ou un CDN dédié.
- **Premium** : RevenueCat + Cloud Function webhook.

Les deux approches sont compatibles avec la couche `services/` sans modifier
l'UI.

---

## Tests

`test/widget_test.dart` couvre la logique pure (IMC, calories, niveaux,
progression des défis). Étends-le par feature au besoin
(`flutter test --coverage`).

---

## Choix techniques — justification

| Choix | Pourquoi |
|---|---|
| **Flutter** | Une base de code iOS + Android, UI riche et animée. |
| **Provider** | Léger, idiomatique, suffisant ici (pas besoin de BLoC/Riverpod). |
| **shared_preferences** | Démo immédiate sans backend ; couche isolée donc remplaçable. |
| **OpenAI + fallback** | Conseils de qualité quand configuré, app utilisable sinon. |
| **RevenueCat** | Gère StoreKit + Play Billing et les webhooks d'entitlement. |
| **Stripe (boutique)** | Les biens physiques ne peuvent pas passer par l'IAP. |
