# Publication — assets & signing

Tout le nécessaire pour préparer la publication de FitFlow sur les stores.

## Branding (icône & splash)

Les sources sont dans [`../assets/branding/`](../assets/branding/) :
`icon_1024.png` (icône), `icon_foreground.png` (premier plan adaptatif Android),
`splash.png` (logo de splash). Pour régénérer les déclinaisons natives :

```bash
cd fitflow
flutter pub get
dart run flutter_launcher_icons          # icônes Android/iOS/web
dart run flutter_native_splash:create    # splash Android/iOS
```

La config se trouve dans `pubspec.yaml` (`flutter_launcher_icons:` /
`flutter_native_splash:`). Pour changer le logo, remplace les PNG (le script
`scripts` d'origine est versionné côté repo de génération) et relance.

## Signing Android

1. Génère un keystore (une fois) :
   ```bash
   keytool -genkey -v -keystore ~/fitflow-upload.jks \
     -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
2. `cp deploy/key.properties.example android/key.properties` puis remplis-le
   (fichier gitignoré).
3. Ajoute le bloc de [`android-signing.gradle.kts.snippet`](android-signing.gradle.kts.snippet)
   à `android/app/build.gradle(.kts)`.

## Builds de release

```bash
flutter build appbundle --release --dart-define-from-file=dart_defines.json   # Play Store
flutter build ipa       --release --dart-define-from-file=dart_defines.json   # App Store
```

Le workflow CI `.github/workflows/fitflow-release.yml` construit
automatiquement l'APK + l'AAB sur un tag `v*` (ou via *Run workflow*). Pour des
binaires **signés** en CI, fournis le keystore via les *secrets* du dépôt et
décode-le dans le job avant le build.

## Checklist stores

Voir [`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) — fiches, confidentialité,
abonnements auto-renouvelables, classement de contenu, restauration des achats.
