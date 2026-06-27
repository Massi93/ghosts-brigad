/// App-wide constants & business rules.
class AppConstants {
  AppConstants._();

  static const String appName = 'FitFlow';
  static const String tagline = 'Ton coach fitness & nutrition';

  // Monetisation
  static const double premiumMonthlyPriceEur = 4.99;
  static const String premiumProductId = 'fitflow_premium_monthly';

  // Free-tier limits
  static const int freeExerciseLimit = 5;
  static const int freeCoachMessagesPerDay = 5;
  static const int freeNutritionPlanLimit = 1;

  // Gamification
  static const int pointsPerWorkout = 50;
  static const int pointsPerMealLogged = 10;
  static const int pointsPerStreakDay = 20;
  static const int pointsPerBadge = 100;

  // Storage keys
  static const String kUserProfile = 'fitflow_user_profile';
  static const String kProgressEntries = 'fitflow_progress_entries';
  static const String kCompletedWorkouts = 'fitflow_completed_workouts';
  static const String kLoggedMeals = 'fitflow_logged_meals';
  static const String kGamification = 'fitflow_gamification';
  static const String kSubscription = 'fitflow_subscription';
  static const String kOnboardingDone = 'fitflow_onboarding_done';
  static const String kCoachHistory = 'fitflow_coach_history';
  static const String kSettings = 'fitflow_settings';
  static const String kPrivacyAccepted = 'fitflow_privacy_accepted';
  static const String kPrivacyAcceptedAt = 'fitflow_privacy_accepted_at';

  // Public-facing legal documents (replace with your real hosted URLs).
  static const String privacyPolicyUrl = 'https://fitflow.app/privacy';
  static const String termsOfServiceUrl = 'https://fitflow.app/terms';
  static const String supportEmail = 'support@fitflow.app';

  // Workout session settings bounds
  static const int minRestSeconds = 5;
  static const int maxRestSeconds = 120;
  static const int defaultRestSeconds = 20;
}

/// User fitness levels used to tailor coach advice & program difficulty.
enum FitnessLevel { beginner, intermediate, professional }

extension FitnessLevelX on FitnessLevel {
  String get label => switch (this) {
        FitnessLevel.beginner => 'Débutant',
        FitnessLevel.intermediate => 'Intermédiaire',
        FitnessLevel.professional => 'Professionnel',
      };

  String get englishKey => switch (this) {
        FitnessLevel.beginner => 'beginner',
        FitnessLevel.intermediate => 'intermediate',
        FitnessLevel.professional => 'professional',
      };
}

enum Goal { loseWeight, buildMuscle, getFit, gainStrength, endurance }

extension GoalX on Goal {
  String get label => switch (this) {
        Goal.loseWeight => 'Perdre du poids',
        Goal.buildMuscle => 'Prendre du muscle',
        Goal.getFit => 'Être en forme',
        Goal.gainStrength => 'Gagner en force',
        Goal.endurance => 'Endurance',
      };
}
