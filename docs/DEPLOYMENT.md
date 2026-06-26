# Déploiement — App Store & Play Store

Guide de publication de FitFlow. Suppose que la configuration de
[`SETUP.md`](SETUP.md) est faite (clés, contenu, paiements).

---

## 0. Checklist pré-publication

- [ ] `flutter analyze` sans erreur, `flutter test` au vert.
- [ ] Clés de prod injectées via `--dart-define-from-file` (jamais en dur).
- [ ] Appels OpenAI routés via le backend (clé non exposée dans le binaire).
- [ ] Produits IAP créés et **approuvés** (App Store Connect + Play Console).
- [ ] Politique de confidentialité + CGU en ligne (URL requise par les stores).
- [ ] Mentions santé/disclaimer présentes.
- [ ] Icône, splash screen et captures d'écran prêts (voir §1).

---

## 1. Assets

### Icône d'application

```bash
flutter pub add --dev flutter_launcher_icons
```

`pubspec.yaml` :

```yaml
flutter_launcher_icons:
  android: true
  ios: true
  image_path: "assets/branding/icon_1024.png"   # 1024×1024, sans transparence iOS
  adaptive_icon_background: "#0E1116"
  adaptive_icon_foreground: "assets/branding/icon_foreground.png"
```

```bash
dart run flutter_launcher_icons
```

### Splash screen

```bash
flutter pub add --dev flutter_native_splash
dart run flutter_native_splash:create
```

### Captures d'écran (store listing)

- iOS : 6,7" et 5,5" (obligatoires), idéalement 12,9" iPad.
- Android : téléphone + 7"/10" tablette, + bannière 1024×500.

---

## 2. Build Android (Play Store)

### Signing

```bash
keytool -genkey -v -keystore ~/fitflow-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

`android/key.properties` (git-ignoré) :

```
storePassword=********
keyPassword=********
keyAlias=upload
storeFile=/Users/you/fitflow-upload.jks
```

Référence ce fichier dans `android/app/build.gradle` (bloc `signingConfigs`).

### App Bundle

```bash
flutter build appbundle --release \
  --dart-define-from-file=dart_defines.json
# → build/app/outputs/bundle/release/app-release.aab
```

Téléverse l'`.aab` sur **Play Console → Production**. Renseigne la fiche, le
classement de contenu, la confidentialité des données et les achats intégrés.

---

## 3. Build iOS (App Store)

```bash
flutter build ipa --release \
  --dart-define-from-file=dart_defines.json
# → build/ios/ipa/fitflow.ipa
```

1. Ouvre `ios/Runner.xcworkspace` dans Xcode → règle **Bundle Identifier**,
   **Team** (signing automatique) et la version.
2. Téléverse via **Xcode Organizer** ou
   `xcrun altool --upload-app -f build/ios/ipa/fitflow.ipa ...` /
   **Transporter**.
3. Dans **App Store Connect** : fiche, captures, vie privée (« Nutrition Info »,
   « Health & Fitness »), et configuration des abonnements auto-renouvelables.

> ⚠️ Apple impose : restauration des achats, lien de gestion d'abonnement, et
> description claire du prix/renouvellement sur le paywall (déjà présent dans
> `PaywallSheet`).

---

## 4. Permissions natives à déclarer

| Capacité | iOS (`Info.plist`) | Android (`AndroidManifest.xml`) |
|---|---|---|
| Réseau (IA, vidéos) | *(par défaut)* | `<uses-permission android:name="android.permission.INTERNET"/>` |
| Lecture vidéo HLS | `NSAppTransportSecurity` si HTTP | — |

(Les achats et l'auth sociale ajoutent leurs propres entrées — suivre la doc du
SDK choisi : RevenueCat, google_sign_in, sign_in_with_apple.)

---

## 5. CI/CD (optionnel)

Pipeline type (GitHub Actions / Codemagic) :

1. `flutter pub get`
2. `flutter analyze && flutter test`
3. `flutter build appbundle/ipa --dart-define-from-file=...`
4. Upload : `fastlane supply` (Play) / `fastlane deliver` (App Store).

Stocke les secrets (keystore, clés, defines) dans les **secrets du CI**, jamais
dans le dépôt.

---

## 6. Versioning

La version est dans `pubspec.yaml` : `version: 1.0.0+1`
(`<semver>+<buildNumber>`). Incrémente le build number à chaque upload store.
