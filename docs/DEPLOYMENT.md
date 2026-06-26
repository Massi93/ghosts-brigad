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

> ✅ **Déjà prêt.** L'icône et le splash sont fournis dans
> `assets/branding/` et **pré-configurés** dans `pubspec.yaml`. Il suffit de
> générer les déclinaisons natives (après `flutter create .`) :

### Icône & splash (pré-configurés)

```bash
flutter pub get
dart run flutter_launcher_icons          # icônes Android/iOS/web
dart run flutter_native_splash:create    # splash Android/iOS
```

Pour personnaliser le logo : remplace les PNG d'`assets/branding/` (ou relance
`python3 scripts/generate_branding.py` après `pip install Pillow`), puis
ré-exécute les deux commandes ci-dessus. Détails : `deploy/README.md`.

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

## 5. CI/CD (déjà en place)

Deux workflows GitHub Actions sont fournis (`.github/workflows/`) :

| Workflow | Déclencheur | Rôle |
|---|---|---|
| `fitflow-ci.yml` | push / PR sur `fitflow/**` | `flutter analyze` + `flutter test` |
| `fitflow-release.yml` | tag `v*` ou *Run workflow* | régénère le natif, génère icône+splash, build **APK + AAB**, publie les artefacts |

Sans secret, le build de release utilise la signature *debug* (build valide pour
vérification). Pour des binaires **signés**, ajoute le keystore via les *secrets*
du dépôt, décode-le dans le job, et complète avec
`fastlane supply` (Play) / `fastlane deliver` (App Store). Stocke clés et
defines dans les *secrets* du CI, jamais dans le dépôt.

---

## 6. Versioning

La version est dans `pubspec.yaml` : `version: 1.0.0+1`
(`<semver>+<buildNumber>`). Incrémente le build number à chaque upload store.
