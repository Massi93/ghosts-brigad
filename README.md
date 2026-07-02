# Ce dépôt contient deux projets distincts

| Projet | Dossier | Description |
|---|---|---|
| 🤖 **Ghosts Brigad MT5** | [`ghostsbrigad-mt5/`](ghostsbrigad-mt5/) | Bot scalping MetaTrader 5 multi-stratégies pour Exness : frais par type de compte (Standard/Pro/Raw/Zero), sentiment news + Telegram (service Sentinel), sorties intelligentes |
| 💪 **FitFlow** | [`fitflow/`](fitflow/) | App mobile fitness & nutrition (Flutter, iOS + Android) avec coach IA |

Chaque dossier est **indépendant** : il a son propre README, ses dépendances et son cycle de build.

## Démarrage rapide par projet

### Ghosts Brigad MT5

```bash
cd ghostsbrigad-mt5
# Voir le README pour l'installation des fichiers .mq5 / .mqh dans MetaTrader 5
```

→ [Documentation complète](ghostsbrigad-mt5/README.md)

### FitFlow

```bash
cd fitflow
flutter create . --platforms=ios,android,web
flutter pub get
flutter run
```

→ [Documentation complète](fitflow/README.md)
→ [Configuration backend (Firebase, OpenAI, RevenueCat)](fitflow/docs/SETUP.md)
→ [Publication App Store & Play Store](fitflow/docs/DEPLOYMENT.md)

## CI / CD

Les workflows GitHub Actions à la racine ne ciblent **que FitFlow** pour l'instant :

- `.github/workflows/fitflow-ci.yml` — `flutter analyze` + `flutter test` à chaque push.
- `.github/workflows/fitflow-release.yml` — build de l'APK Android et publication en GitHub Release sur tag `v*` ou déclenchement manuel.
