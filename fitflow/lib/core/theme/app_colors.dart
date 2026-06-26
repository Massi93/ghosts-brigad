import 'package:flutter/material.dart';

/// FitFlow energetic colour system.
/// Vibrant lime/electric accent over deep charcoal for an energetic,
/// modern look that works in light & dark surfaces.
class AppColors {
  AppColors._();

  // Brand / accent
  static const Color primary = Color(0xFF00E676); // electric green
  static const Color primaryDark = Color(0xFF00B85C);
  static const Color secondary = Color(0xFFFF6D00); // energetic orange
  static const Color accent = Color(0xFF7C4DFF); // violet for gamification

  // Backgrounds
  static const Color background = Color(0xFF0E1116);
  static const Color surface = Color(0xFF171C24);
  static const Color surfaceAlt = Color(0xFF1F2630);
  static const Color card = Color(0xFF1A2029);

  // Text
  static const Color textPrimary = Color(0xFFF5F7FA);
  static const Color textSecondary = Color(0xFF9AA5B1);
  static const Color textMuted = Color(0xFF5C6773);

  // Feedback
  static const Color success = Color(0xFF00E676);
  static const Color warning = Color(0xFFFFC400);
  static const Color error = Color(0xFFFF5252);
  static const Color info = Color(0xFF40C4FF);

  // Gamification tiers
  static const Color gold = Color(0xFFFFD54F);
  static const Color silver = Color(0xFFB0BEC5);
  static const Color bronze = Color(0xFFA1887F);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF00E676), Color(0xFF00B0FF)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient energyGradient = LinearGradient(
    colors: [Color(0xFFFF6D00), Color(0xFFFF1744)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient premiumGradient = LinearGradient(
    colors: [Color(0xFF7C4DFF), Color(0xFF18FFFF)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient cardGradient = LinearGradient(
    colors: [Color(0xFF1F2630), Color(0xFF141A22)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}
