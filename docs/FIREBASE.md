# Backend Firebase — FitFlow

FitFlow peut utiliser **Firebase** comme backend (Auth + Firestore + Storage)
au lieu du mode local. C'est l'option « la plus simple » : pas de serveur à
gérer, auth et base de données prêtes à l'emploi.

Le code est déjà intégré et **désactivé par défaut** (`USE_FIREBASE=false`) pour
que l'app tourne sans config. Suis ce guide pour l'activer.

---

## 1. Créer le projet Firebase

1. <https://console.firebase.google.com> → **Ajouter un projet** (ex. `fitflow-app`).
2. Active les produits :
   - **Authentication** → méthode **E-mail/Mot de passe** (et, optionnel,
     **Anonyme** pour le fallback social ci-dessous).
   - **Cloud Firestore** → crée la base en mode production.
   - **Storage** (pour héberger les vidéos d'exercices, optionnel).

## 2. Connecter l'app (FlutterFire)

```bash
dart pub global activate flutterfire_cli
cd fitflow
flutterfire configure
```

Cela **régénère `lib/firebase_options.dart`** avec les vraies clés et crée les
fichiers natifs (`google-services.json`, `GoogleService-Info.plist`). Le fichier
actuel n'est qu'un gabarit qui permet de compiler.

```bash
flutter pub get
```

## 3. Lancer en mode Firebase

```bash
flutter run --dart-define=USE_FIREBASE=true
```

À ce moment :
- L'inscription / connexion par e-mail passe par **Firebase Auth**.
- Le profil utilisateur est créé et synchronisé dans Firestore
  (`users/{uid}`) — l'utilisateur retrouve son profil sur n'importe quel
  appareil.

## 4. Architecture de l'intégration

| Élément | Fichier | Rôle |
|---|---|---|
| Init | `services/firebase/firebase_bootstrap.dart` | `Firebase.initializeApp` (au démarrage si `USE_FIREBASE`) |
| Auth + profil | `services/firebase/firebase_auth_service.dart` | implémente `AuthService`, sync `users/{uid}` |
| Sync data | `services/firebase/firestore_repository.dart` | progression `users/{uid}/progress/{id}` |
| Sélecteur | `main.dart` | choisit `FirebaseAuthService` ou `LocalAuthService` |

Tout passe par l'interface `AuthService` : aucun écran ne dépend de Firebase.

## 5. Activer la synchro de progression (optionnel)

`FirestoreRepository` est prêt. Pour synchroniser la progression dans le cloud,
injecte-le dans `ProgressProvider` et reflète les écritures :

```dart
// main.dart — quand USE_FIREBASE et un utilisateur est connecté :
final repo = FirestoreRepository(firebaseAuth.currentUser!.id);
// → passe `repo` à ProgressProvider et, dans addEntry(), appelle aussi
//   repo.saveEntry(entry); au chargement, fusionne repo.fetchProgress().
```

## 6. Règles de sécurité Firestore (à coller dans la console)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      match /{sub=**} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
    // Catalogue public en lecture seule
    match /exercises/{doc}    { allow read: if true; }
    match /programs/{doc}     { allow read: if true; }
    match /nutritionPlans/{doc} { allow read: if true; }
    match /products/{doc}     { allow read: if true; }
  }
}
```

## 7. Login social Google / Apple

✅ **Le code est implémenté** dans `FirebaseAuthService.signInWithProvider`
(`google_sign_in` + `sign_in_with_apple` → `signInWithCredential`). Il reste à
faire la **configuration côté comptes** (que seul le propriétaire du projet peut
faire) :

### Google Sign-In
1. Console Firebase → Authentication → Sign-in method → active **Google**.
2. **Android** : ajoute l'empreinte **SHA-1** (et SHA-256) de ta clé de
   signing dans les paramètres du projet Firebase, puis re-télécharge
   `google-services.json` (`flutterfire configure` le refait).
   ```bash
   keytool -list -v -keystore ~/fitflow-upload.jks -alias upload   # SHA-1
   ```
3. **iOS** : ajoute le `REVERSED_CLIENT_ID` (depuis `GoogleService-Info.plist`)
   comme URL scheme dans `ios/Runner/Info.plist`.

### Sign in with Apple
1. Console Firebase → Authentication → active **Apple**.
2. **Apple Developer** : active la capability **Sign in with Apple** sur l'App
   ID, crée un **Service ID** + une **Key** (pour le flux web/Android), et
   renseigne-les dans la config Apple de Firebase.
3. **Xcode** : ajoute la capability *Sign in with Apple* à la target Runner.

Sans ces étapes, les boutons existent mais l'authentification échouera côté
natif. En mode local (sans `USE_FIREBASE`), les boutons créent une session de
démo.

## 8. Coach IA & paiements côté serveur (recommandé)

Les **Cloud Functions sont déjà fournies** dans [`../functions/`](../functions/) :

- **`coach`** : proxy OpenAI (clé gardée côté serveur). Lance l'app avec
  `--dart-define=API_BASE_URL=https://<region>-<projet>.cloudfunctions.net` et
  `AiCoachService` l'utilise automatiquement à la place d'OpenAI direct.
- **`revenuecatWebhook`** : met à jour `users/{uid}.premium` à partir des
  événements RevenueCat.

Déploiement : voir [`../functions/README.md`](../functions/README.md)
(`firebase functions:secrets:set OPENAI_API_KEY` puis
`firebase deploy --only functions`).

---

> Revenir au mode local : lance simplement sans `--dart-define=USE_FIREBASE=true`.
