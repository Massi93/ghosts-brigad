import '../core/constants/env.dart';
import '../models/exercise.dart';
import '../models/nutrition_plan.dart';
import '../models/product.dart';
import '../models/workout_program.dart';
import '../data/mock_exercises.dart';
import '../data/mock_nutrition.dart';
import '../data/mock_products.dart';
import '../data/mock_programs.dart';

/// Provides app content (exercises, programs, nutrition, shop).
///
/// When [Env.apiBaseUrl] is set this would fetch from the Node.js/PostgreSQL
/// backend; otherwise it serves the bundled mock catalogue so the app works
/// offline. Centralising this means screens never care where data comes from.
class ContentService {
  Future<List<Exercise>> getExercises() async {
    if (Env.hasBackend) {
      // return _fetchList('/exercises', Exercise.fromJson);
    }
    return kExercises;
  }

  Future<List<WorkoutProgram>> getPrograms() async => kPrograms;

  Future<List<NutritionPlan>> getNutritionPlans() async => kNutritionPlans;

  Future<List<Product>> getProducts() async => kProducts;

  /// Recommend a program for the user's level (used on the home screen).
  WorkoutProgram recommendedFor(String levelKey) {
    return kPrograms.firstWhere(
      (p) => p.level.englishKey == levelKey,
      orElse: () => kPrograms.first,
    );
  }
}
