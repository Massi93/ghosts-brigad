import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/user_provider.dart';
import '../onboarding/onboarding_screen.dart';
import '../home/root_shell.dart';
import 'login_screen.dart';

/// Decides which top-level flow to show based on auth + onboarding state.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<UserProvider>(
      builder: (context, user, _) {
        if (!user.isAuthenticated) return const LoginScreen();
        if (!user.onboardingComplete) return const OnboardingScreen();
        return const RootShell();
      },
    );
  }
}
