/// Runtime configuration & secrets.
///
/// Values are injected at build time via `--dart-define`, e.g.:
///
/// ```bash
/// flutter run \
///   --dart-define=OPENAI_API_KEY=sk-... \
///   --dart-define=OPENAI_MODEL=gpt-4o-mini \
///   --dart-define=API_BASE_URL=https://api.fitflow.app
/// ```
///
/// Never hard-code real keys in source control. See docs/SETUP.md.
class Env {
  Env._();

  /// OpenAI key used by the AI coach. When empty the coach falls back to a
  /// built-in offline rule-based engine so the app stays fully usable in demo.
  static const String openAiApiKey =
      String.fromEnvironment('OPENAI_API_KEY', defaultValue: '');

  static const String openAiModel =
      String.fromEnvironment('OPENAI_MODEL', defaultValue: 'gpt-4o-mini');

  /// Optional REST backend (Node.js). When empty the app runs fully local
  /// with mock content + shared_preferences persistence.
  static const String apiBaseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: '');

  /// RevenueCat public SDK key (recommended for cross-platform IAP).
  static const String revenueCatKey =
      String.fromEnvironment('REVENUECAT_KEY', defaultValue: '');

  /// Use Firebase (Auth + Firestore) as the backend instead of local-only.
  /// Requires `flutterfire configure` to have generated firebase_options.dart.
  /// Build with: `--dart-define=USE_FIREBASE=true`.
  static const bool useFirebase =
      bool.fromEnvironment('USE_FIREBASE', defaultValue: false);

  static bool get hasOpenAi => openAiApiKey.isNotEmpty;
  static bool get hasBackend => apiBaseUrl.isNotEmpty;
  static bool get hasRevenueCat => revenueCatKey.isNotEmpty;
}
