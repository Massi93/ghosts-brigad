import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import '../../models/user_profile.dart';
import '../auth_service.dart';

/// Real authentication backed by Firebase Auth, with the user profile synced to
/// Cloud Firestore (`users/{uid}`). Selected in `main.dart` when
/// `--dart-define=USE_FIREBASE=true`.
///
/// [restoreSession] must be awaited at startup (before building providers) so
/// the synchronous [currentUser] can return the already-loaded profile.
class FirebaseAuthService implements AuthService {
  FirebaseAuthService({FirebaseAuth? auth, FirebaseFirestore? firestore})
      : _auth = auth ?? FirebaseAuth.instance,
        _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseAuth _auth;
  final FirebaseFirestore _db;

  UserProfile? _cached;

  DocumentReference<Map<String, dynamic>> _doc(String uid) =>
      _db.collection('users').doc(uid);

  /// Loads the persisted session (if any) into [_cached]. Call once at startup.
  Future<void> restoreSession() async {
    final user = _auth.currentUser;
    if (user == null) {
      _cached = null;
      return;
    }
    _cached = await _loadOrCreateProfile(user);
  }

  @override
  UserProfile? currentUser() => _cached;

  Future<UserProfile> _loadOrCreateProfile(User user) async {
    final snap = await _doc(user.uid).get();
    final data = snap.data();
    if (snap.exists && data != null) {
      return UserProfile.fromJson({...data, 'id': user.uid});
    }
    final profile = UserProfile(
      id: user.uid,
      name: user.displayName ?? (user.email?.split('@').first ?? 'Athlète'),
      email: user.email ?? '',
      createdAt: DateTime.now(),
    );
    await _doc(user.uid).set(profile.toJson());
    return profile;
  }

  @override
  Future<UserProfile> signUp({
    required String name,
    required String email,
    required String password,
  }) async {
    final cred = await _auth.createUserWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
    final user = cred.user!;
    await user.updateDisplayName(name.trim());
    final profile = UserProfile(
      id: user.uid,
      name: name.trim(),
      email: email.trim(),
      createdAt: DateTime.now(),
    );
    await _doc(user.uid).set(profile.toJson());
    _cached = profile;
    return profile;
  }

  @override
  Future<UserProfile> signIn({
    required String email,
    required String password,
  }) async {
    final cred = await _auth.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
    _cached = await _loadOrCreateProfile(cred.user!);
    return _cached!;
  }

  /// Real Google / Apple sign-in via Firebase credentials.
  /// Returns null if the user cancels the native sheet. Requires native config
  /// (OAuth client, SHA-1, Apple capability) — see docs/FIREBASE.md §7.
  @override
  Future<UserProfile?> signInWithProvider(String provider) async {
    final UserCredential cred;
    switch (provider) {
      case 'google':
        final credential = await _googleCredential();
        if (credential == null) return null; // cancelled
        cred = await _auth.signInWithCredential(credential);
        break;
      case 'apple':
        final credential = await _appleCredential();
        if (credential == null) return null; // cancelled
        cred = await _auth.signInWithCredential(credential);
        break;
      default:
        return null;
    }
    _cached = await _loadOrCreateProfile(cred.user!);
    return _cached;
  }

  Future<AuthCredential?> _googleCredential() async {
    final account = await GoogleSignIn().signIn();
    if (account == null) return null; // user cancelled
    final auth = await account.authentication;
    return GoogleAuthProvider.credential(
      accessToken: auth.accessToken,
      idToken: auth.idToken,
    );
  }

  Future<AuthCredential?> _appleCredential() async {
    try {
      final apple = await SignInWithApple.getAppleIDCredential(
        scopes: const [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );
      return OAuthProvider('apple.com').credential(
        idToken: apple.identityToken,
        accessToken: apple.authorizationCode,
      );
    } on SignInWithAppleAuthorizationException catch (e) {
      if (e.code == AuthorizationErrorCode.canceled) return null;
      rethrow;
    }
  }

  @override
  Future<void> updateProfile(UserProfile profile) async {
    _cached = profile;
    await _doc(profile.id).set(profile.toJson(), SetOptions(merge: true));
  }

  @override
  Future<void> signOut() async {
    await _auth.signOut();
    _cached = null;
  }
}
