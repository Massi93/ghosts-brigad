import 'package:uuid/uuid.dart';

import '../core/constants/app_constants.dart';
import '../models/user_profile.dart';
import 'storage_service.dart';

/// Authentication abstraction. Implemented by [LocalAuthService] (offline demo)
/// and by `FirebaseAuthService` (real auth). The rest of the app depends only
/// on this interface, so the backend is swappable in `main.dart`.
abstract class AuthService {
  /// Returns the current session's profile, or null if signed out.
  UserProfile? currentUser();

  Future<UserProfile> signUp({
    required String name,
    required String email,
    required String password,
  });

  Future<UserProfile> signIn({
    required String email,
    required String password,
  });

  /// Social login (e.g. 'google', 'apple'). Returns null if the user cancels.
  Future<UserProfile?> signInWithProvider(String provider);

  Future<void> updateProfile(UserProfile profile);

  Future<void> signOut();
}

/// Local, device-only auth that persists the profile via [StorageService].
/// Enough to run and demo the whole app with zero backend setup.
class LocalAuthService implements AuthService {
  LocalAuthService(this._storage);

  final StorageService _storage;
  final _uuid = const Uuid();

  @override
  UserProfile? currentUser() {
    final json = _storage.readJsonMap(AppConstants.kUserProfile);
    if (json == null) return null;
    return UserProfile.fromJson(json);
  }

  @override
  Future<UserProfile> signUp({
    required String name,
    required String email,
    required String password,
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

  @override
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

  @override
  Future<UserProfile?> signInWithProvider(String provider) async {
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

  @override
  Future<void> updateProfile(UserProfile profile) =>
      _storage.writeJson(AppConstants.kUserProfile, profile.toJson());

  @override
  Future<void> signOut() => _storage.remove(AppConstants.kUserProfile);
}
