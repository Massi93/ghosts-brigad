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

  /// Permanently delete the user account and all data managed by this service.
  /// Used by the GDPR "delete my account" flow. Implementations MUST also
  /// remove any sub-collection the service owns (e.g. profile document).
  Future<void> deleteAccount();
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
    // Email sign-up provides at least a first name → details still need the
    // phone/age, so route through AdditionalInfoScreen (detailsComplete=false).
    final profile = UserProfile(
      id: _uuid.v4(),
      name: name.trim(),
      email: email.trim(),
      firstName: name.trim(),
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
    final profile = UserProfile(
      id: _uuid.v4(),
      name: email.split('@').first,
      email: email.trim(),
      firstName: email.split('@').first,
      createdAt: DateTime.now(),
    );
    await _storage.writeJson(AppConstants.kUserProfile, profile.toJson());
    return profile;
  }

  @override
  Future<UserProfile?> signInWithProvider(String provider) async {
    // Demo Google/Apple flow: leave detailsComplete=false so the user goes
    // through the AdditionalInfoScreen, mirroring the real Firebase flow.
    await Future<void>.delayed(const Duration(milliseconds: 500));
    final profile = UserProfile(
      id: _uuid.v4(),
      name: 'Athlète FitFlow',
      email: 'demo@$provider.fitflow',
      firstName: provider == 'apple' ? 'Athlète' : null,
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

  @override
  Future<void> deleteAccount() async {
    // Local impl: there is no remote record, just drop the persisted profile.
    await _storage.remove(AppConstants.kUserProfile);
  }
}
