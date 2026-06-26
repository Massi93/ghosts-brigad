import 'dart:convert';

import '../core/constants/app_constants.dart';
import '../models/user_profile.dart';
import 'storage_service.dart';

/// Builds a complete JSON snapshot of everything FitFlow stores about the
/// signed-in user. Used by the GDPR "Right to access" / data export flow.
///
/// The bundle is self-contained and human-readable so the user (or their
/// regulator) can inspect it without our app.
class DataExportService {
  DataExportService(this._storage);

  final StorageService _storage;

  /// Returns a pretty-printed JSON string ready to be shared / emailed.
  String buildExport(UserProfile? profile) {
    final bundle = <String, dynamic>{
      'meta': {
        'app': AppConstants.appName,
        'version': '1.0.0',
        'exportedAt': DateTime.now().toIso8601String(),
        'docs': {
          'privacyPolicy': AppConstants.privacyPolicyUrl,
          'support': AppConstants.supportEmail,
        },
      },
      'profile': profile?.toJson(),
      'progressEntries':
          _storage.readJsonList(AppConstants.kProgressEntries) ?? const [],
      'completedWorkouts':
          _storage.readJsonList(AppConstants.kCompletedWorkouts) ?? const [],
      'loggedMeals':
          _storage.readJsonList(AppConstants.kLoggedMeals) ?? const [],
      'gamification':
          _storage.readJsonMap(AppConstants.kGamification),
      'coachHistory':
          _storage.readJsonMap(AppConstants.kCoachHistory),
      'consent': {
        'privacyAccepted':
            _storage.readBool(AppConstants.kPrivacyAccepted),
        'acceptedAt':
            _storage.readJsonMap(AppConstants.kPrivacyAcceptedAt)?['at'],
      },
    };
    return const JsonEncoder.withIndent('  ').convert(bundle);
  }
}
