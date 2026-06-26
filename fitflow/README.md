# FitFlow ⚡

**Ton coach fitness & nutrition par IA — iOS & Android (Flutter).**

FitFlow est une application mobile complète de fitness et nutrition : coach IA
personnalisé, programmes vidéo pour tous les niveaux, plans nutrition
modifiables, suivi de progression avec graphiques, gamification (points, badges,
défis) et boutique de produits nutrition intégrée.

> L'app est **100 % fonctionnelle hors-ligne** dès le premier lancement grâce à
> un catalogue de contenu intégré et une persistance locale. Branche tes clés
> (OpenAI, RevenueCat/Stripe) et ton backend quand tu es prêt — voir
> [`docs/SETUP.md`](docs/SETUP.md).

---

## ✨ Fonctionnalités

| Domaine | Détails |
|---|---|
| 🤖 **Coach IA** | « Coach Flow » adapte ses conseils au niveau (débutant / intermédiaire / pro) et à l'objectif. Intégration **OpenAI** avec prompt système personnalisé, + moteur de secours hors-ligne. |
| 🏋️ **Entraînement** | Programmes vidéo filtrables par niveau, fiches exercices détaillées avec lecteur vidéo, séries/reps/calories et conseils technique. |
| 🥗 **Nutrition** | Besoin calorique calculé (Mifflin-St Jeor), plans alimentaires basés sur des **templates modifiables**, macros par repas, logging des repas. |
| 📈 **Progression** | Graphiques poids & calories (`fl_chart`), statistiques, ajout de mesures. |
| 🎮 **Gamification** | Points, niveaux, série quotidienne, badges (bronze/argent/or) et défis récompensés. |
| 🛒 **Boutique** | Protéines, barres, suppléments, accessoires, panier et checkout (Stripe-ready). |
| 💳 **Freemium** | Gratuit limité (5 exercices, coach limité/jour) · Premium 4,99 €/mois (tout illimité). |
| 🔐 **Auth** | Email + boutons Google/Apple (abstraction prête pour Firebase/JWT). |

## 🎨 Design

Interface **minimaliste et moderne**, thème sombre énergique (vert électrique +
orange), Material 3, typographie Google Fonts (Poppins), animations et feedback
visuel, navigation par 5 onglets : **Accueil · Entraînement · Nutrition ·
Progression · Boutique**.

## 🏗️ Stack technique

- **Frontend :** Flutter (Dart) — cross-platform iOS & Android, responsive.
- **State management :** Provider (`ChangeNotifier`).
- **Persistance locale :** `shared_preferences` (couche `StorageService`).
- **IA :** API OpenAI Chat Completions (`gpt-4o-mini` par défaut).
- **Vidéo :** `video_player` + `chewie`.
- **Charts :** `fl_chart`.
- **Paiements :** abstraction `SubscriptionService` (RevenueCat recommandé) +
  checkout boutique (Stripe).
- **Backend (optionnel) :** Node.js + PostgreSQL **ou** Firebase — l'app
  fonctionne sans, voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 🚀 Démarrage rapide

```bash
# 1. Pré-requis : Flutter SDK ≥ 3.19  (flutter doctor)
cd fitflow

# 2. Générer les dossiers natifs (android/ ios/ web) — ignorés par git
flutter create . --platforms=ios,android,web

# 3. Installer les dépendances
flutter pub get

# 4. Lancer (mode démo, sans aucune clé requise)
flutter run

# 5. Lancer avec le coach IA OpenAI + RevenueCat
flutter run \
  --dart-define=OPENAI_API_KEY=sk-xxxx \
  --dart-define=OPENAI_MODEL=gpt-4o-mini \
  --dart-define=REVENUECAT_KEY=appl_xxxx
```

> ℹ️ Les dossiers `android/`, `ios/`, `web/` ne sont pas versionnés (voir
> `.gitignore`). `flutter create .` les régénère à partir du `pubspec.yaml`
> sans toucher à `lib/`.

## 🧪 Tests

```bash
flutter test          # tests unitaires (modèles, calculs, gamification)
flutter analyze       # analyse statique
```

## 📁 Structure du projet

```
lib/
├── main.dart                 # bootstrap + injection des providers
├── core/
│   ├── constants/            # env (clés via --dart-define) & règles métier
│   ├── theme/                # couleurs, thème Material 3
│   └── widgets/              # widgets réutilisables (boutons, paywall, vidéo…)
├── models/                   # UserProfile, Exercise, Program, NutritionPlan…
├── data/                     # catalogue de contenu intégré (mock)
├── services/                 # AI coach, auth, abonnement, contenu, stockage
├── providers/                # état (ChangeNotifier) par domaine
└── features/                 # écrans par fonctionnalité
    ├── auth/  onboarding/  home/  workout/
    ├── nutrition/  progress/  coach/  shop/  profile/
```

## 📚 Documentation

- [`docs/SETUP.md`](docs/SETUP.md) — configuration des clés API, backend, contenu vidéo, auth, paiements.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — publication App Store & Play Store, assets, signing.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture, choix techniques, comment brancher un backend.

## ⚠️ Avertissement

FitFlow fournit des conseils de bien-être à but informatif. Ce n'est pas un avis
médical. Conseille à tes utilisateurs de consulter un professionnel de santé
avant de commencer un programme.

## 📄 Licence

Propriétaire — © FitFlow. Tous droits réservés.
