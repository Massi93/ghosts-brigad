import 'package:flutter_test/flutter_test.dart';
import 'package:fitflow/core/constants/env.dart';
import 'package:fitflow/core/constants/app_constants.dart';
import 'package:fitflow/models/user_profile.dart';
import 'package:fitflow/services/signup_relay_service.dart';

void main() {
  test('notifySignup is a silent no-op when no webhook URL is configured', () async {
    // Default build has no SIGNUP_WEBHOOK_URL.
    expect(Env.hasSignupWebhook, isFalse);
    final profile = UserProfile(
      id: 'u',
      name: 'Test',
      email: 'a@b.c',
      firstName: 'Test',
      lastName: 'User',
      age: 30,
      phone: '0612345678',
      createdAt: DateTime(2024),
      level: FitnessLevel.beginner,
      goal: Goal.getFit,
    );
    // Should complete without throwing, doing nothing.
    await SignupRelayService().notifySignup(profile);
  });
}
