# 💪 FitFlow — App fitness & nutrition (branche `fitflow`)

Cette branche contient uniquement le projet **FitFlow** : app mobile
fitness & nutrition (Flutter, iOS + Android) avec coach IA.

## Démarrage rapide

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

- `.github/workflows/fitflow-ci.yml` — `flutter analyze` + `flutter test` à chaque push.
- `.github/workflows/fitflow-release.yml` — build de l'APK Android et publication en GitHub Release sur tag `v*` ou déclenchement manuel.

## Les autres projets du dépôt

| Projet | Branche |
|---|---|
| 🤖 Bot trading MT5 | `BrigadBot` |
| 💪 FitFlow (app fitness) | `fitflow` (cette branche) |
| 🌐 Dani Inmigración (site) | `dani` |
| 🛒 Das Shop | `das-shop` |
