import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

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

  /// Social login. Real Google/Apple require the `google_sign_in` /
  /// `sign_in_with_apple` packages and native config (see docs/FIREBASE.md).
  /// Until then this falls back to a Firebase anonymous session so the flow
  /// stays functional end-to-end.
  @override
  Future<UserProfile> signInWithProvider(String provider) async {
    final cred = await _auth.signInAnonymously();
    final user = cred.user!;
    final profile = UserProfile(
      id: user.uid,
      name: 'Athlète FitFlow',
      email: user.email ?? 'anonymous@$provider.fitflow',
      createdAt: DateTime.now(),
    );
    await _doc(user.uid).set(profile.toJson());
    _cached = profile;
    return profile;
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
