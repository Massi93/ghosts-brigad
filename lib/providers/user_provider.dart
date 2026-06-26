import 'package:flutter/foundation.dart';

import '../core/constants/app_constants.dart';
import '../models/user_profile.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';
import '../services/subscription_service.dart';

/// Owns authentication, the user profile and subscription entitlement.
class UserProvider extends ChangeNotifier {
  UserProvider(this._auth, this._subs, this._storage) {
    _profile = _auth.currentUser();
    _onboardingDone = _storage.readBool(AppConstants.kOnboardingDone);
    _privacyAccepted = _storage.readBool(AppConstants.kPrivacyAccepted);
  }

  final AuthService _auth;
  final SubscriptionService _subs;
  final StorageService _storage;

  UserProfile? _profile;
  bool _loading = false;
  bool _onboardingDone = false;
  bool _privacyAccepted = false;

  UserProfile? get profile => _profile;
  bool get isAuthenticated => _profile != null;
  bool get isLoading => _loading;
  bool get isPremium => _subs.isPremium;
  bool get onboardingComplete => _onboardingDone;
  bool get privacyAccepted => _privacyAccepted;

  Future<void> acceptPrivacy() async {
    _privacyAccepted = true;
    await _storage.writeBool(AppConstants.kPrivacyAccepted, true);
    await _storage.writeJson(AppConstants.kPrivacyAcceptedAt,
        {'at': DateTime.now().toIso8601String()});
    notifyListeners();
  }

  Future<void> signUp({
    required String name,
    required String email,
    required String password,
  }) async {
    _setLoading(true);
    _profile = await _auth.signUp(name: name, email: email, password: password);
    _setLoading(false);
  }

  Future<void> signIn({required String email, required String password}) async {
    _setLoading(true);
    _profile = await _auth.signIn(email: email, password: password);
    _setLoading(false);
  }

  /// Returns false if the user cancelled or sign-in failed.
  Future<bool> signInWithProvider(String provider) async {
    _setLoading(true);
    try {
      final profile = await _auth.signInWithProvider(provider);
      if (profile == null) return false; // cancelled
      _profile = profile;
      return true;
    } catch (_) {
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> completeOnboarding({
    required int age,
    required double heightCm,
    required double weightKg,
    required FitnessLevel level,
    required Goal goal,
  }) async {
    if (_profile == null) return;
    _profile = _profile!.copyWith(
      age: age,
      heightCm: heightCm,
      weightKg: weightKg,
      level: level,
      goal: goal,
    );
    await _auth.updateProfile(_profile!);
    _onboardingDone = true;
    await _storage.writeBool(AppConstants.kOnboardingDone, true);
    notifyListeners();
  }

  Future<void> updateProfile(UserProfile updated) async {
    _profile = updated;
    await _auth.updateProfile(updated);
    notifyListeners();
  }

  Future<bool> upgradeToPremium() async {
    final ok = await _subs.purchasePremium();
    notifyListeners();
    return ok;
  }

  Future<void> cancelPremium() async {
    await _subs.cancel();
    notifyListeners();
  }

  Future<void> signOut() async {
    await _auth.signOut();
    await _storage.writeBool(AppConstants.kOnboardingDone, false);
    _profile = null;
    _onboardingDone = false;
    notifyListeners();
  }

  /// GDPR "Right to be forgotten": delete the auth account + all user-scoped
  /// data (profile, progress, completed workouts, meals, gamification, coach
  /// history, subscription, settings). Returns true on success.
  Future<bool> deleteAccount() async {
    _setLoading(true);
    try {
      await _auth.deleteAccount();
      // Wipe every local key we own.
      for (final key in const [
        AppConstants.kUserProfile,
        AppConstants.kProgressEntries,
        AppConstants.kCompletedWorkouts,
        AppConstants.kLoggedMeals,
        AppConstants.kGamification,
        AppConstants.kSubscription,
        AppConstants.kOnboardingDone,
        AppConstants.kCoachHistory,
        AppConstants.kSettings,
        AppConstants.kPrivacyAccepted,
        AppConstants.kPrivacyAcceptedAt,
      ]) {
        await _storage.remove(key);
      }
      _profile = null;
      _onboardingDone = false;
      _privacyAccepted = false;
      return true;
    } catch (_) {
      return false;
    } finally {
      _setLoading(false);
    }
  }

  void _setLoading(bool v) {
    _loading = v;
    notifyListeners();
  }
}
