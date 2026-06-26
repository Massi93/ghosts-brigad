import 'package:uuid/uuid.dart';

import '../core/constants/app_constants.dart';
import '../models/user_profile.dart';
import 'storage_service.dart';

/// Authentication abstraction.
///
/// The default implementation is a **local** auth that persists the profile on
/// device — enough to run and demo the whole app with zero backend setup.
///
/// To wire real, secure auth (email/password + social login), swap this for a
/// Firebase Auth or REST/JWT implementation behind the same interface. See
/// docs/SETUP.md (section "Authentification").
class AuthService {
  AuthService(this._storage);

  final StorageService _storage;
  final _uuid = const Uuid();

  /// Returns the persisted profile if a session exists.
  UserProfile? currentUser() {
    final json = _storage.readJsonMap(AppConstants.kUserProfile);
    if (json == null) return null;
    return UserProfile.fromJson(json);
  }

  Future<UserProfile> signUp({
    required String name,
    required String email,
    required String password, // hashed/sent to backend in real impl
  }) async {
    // Simulate latency the way a network call would behave.
    await Future<void>.delayed(const Duration(milliseconds: 500));
    final profile = UserProfile(
      id: _uuid.v4(),
      name: name.trim(),
      email: email.trim(),
      createdAt: DateTime.now(),
    );
    await _storage.writeJson(AppConstants.kUserProfile, profile.toJson());
    return profile;
  }

  Future<UserProfile> signIn({
    required String email,
    required String password,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 500));
    final existing = currentUser();
    if (existing != null && existing.email == email.trim()) return existing;
    // Demo: create a session for any credentials (replace with real check).
    final profile = UserProfile(
      id: _uuid.v4(),
      name: email.split('@').first,
      email: email.trim(),
      createdAt: DateTime.now(),
    );
    await _storage.writeJson(AppConstants.kUserProfile, profile.toJson());
    return profile;
  }

  /// Social login placeholder (Google/Apple). Wire to the relevant SDK.
  Future<UserProfile> signInWithProvider(String provider) async {
    await Future<void>.delayed(const Duration(milliseconds: 500));
    final profile = UserProfile(
      id: _uuid.v4(),
      name: 'Athlète FitFlow',
      email: 'user@$provider.com',
      createdAt: DateTime.now(),
    );
    await _storage.writeJson(AppConstants.kUserProfile, profile.toJson());
    return profile;
  }

  Future<void> updateProfile(UserProfile profile) =>
      _storage.writeJson(AppConstants.kUserProfile, profile.toJson());

  Future<void> signOut() => _storage.remove(AppConstants.kUserProfile);
}
