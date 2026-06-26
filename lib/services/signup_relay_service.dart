import 'dart:convert';

import 'package:http/http.dart' as http;

import '../core/constants/env.dart';
import '../models/user_profile.dart';

/// Mirrors new signups to a Google Apps Script webhook (a Google Sheet acting
/// as a lightweight admin dashboard during the test phase). No Firebase
/// required.
///
/// Best-effort: failures are swallowed so the user's signup flow is never
/// blocked by a slow / unreachable Sheet. Disabled entirely when
/// [Env.signupWebhookUrl] is empty.
class SignupRelayService {
  /// Sends prénom/nom/âge/téléphone/email/provider/uid to the Sheet.
  /// [provider] is one of 'email', 'google', 'apple', 'demo'.
  Future<void> notifySignup(UserProfile profile, {String provider = 'email'}) async {
    if (!Env.hasSignupWebhook) return;
    try {
      await http
          .post(
            Uri.parse(Env.signupWebhookUrl),
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode({
              'uid': profile.id,
              'email': profile.email,
              'firstName': profile.firstName ?? '',
              'lastName': profile.lastName ?? '',
              'age': profile.age,
              'phone': profile.phone ?? '',
              'provider': provider,
            }),
          )
          .timeout(const Duration(seconds: 5));
    } catch (_) {
      // Intentionally silent — signup must never fail because the relay is down.
    }
  }
}
