import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/user_provider.dart';
import '../onboarding/additional_info_screen.dart';
import '../onboarding/onboarding_screen.dart';
import '../home/root_shell.dart';
import 'login_screen.dart';

/// Decides which top-level flow to show based on auth + onboarding state.
///
///   not signed in        → LoginScreen
///   signed in,  no civil → AdditionalInfoScreen  (first name / last name /
///                                                 age / phone)
///   signed in,  no goal  → OnboardingScreen      (goal / level / body)
///   fully set up         → RootShell             (the app)
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<UserProvider>(
      builder: (context, user, _) {
        if (!user.isAuthenticated) return const LoginScreen();
        final profile = user.profile;
        if (profile != null && !profile.detailsComplete) {
          return const AdditionalInfoScreen();
        }
        if (!user.onboardingComplete) return const OnboardingScreen();
        return const RootShell();
      },
    );
  }
}
