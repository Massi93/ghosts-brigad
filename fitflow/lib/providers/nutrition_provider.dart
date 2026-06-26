import 'package:flutter/foundation.dart';

import '../core/constants/app_constants.dart';
import '../models/logged_meal_entry.dart';
import '../models/nutrition_plan.dart';
import '../services/content_service.dart';
import '../services/storage_service.dart';

/// Loads nutrition plan templates, tracks logged meals with their date, and
/// computes the day's nutrition totals (kcal + macros).
class NutritionProvider extends ChangeNotifier {
  NutritionProvider(this._content, this._storage) {
    load();
    final raw = _storage.readJsonList(AppConstants.kLoggedMeals) ?? const [];
    _entries = raw.map(LoggedMealEntry.fromJson).toList();
  }

  final ContentService _content;
  final StorageService _storage;

  List<NutritionPlan> _plans = [];
  List<LoggedMealEntry> _entries = [];
  bool _loading = true;

  List<NutritionPlan> get plans => _plans;
  bool get isLoading => _loading;
  int get loggedMealCount => _entries.length;

  /// Has this meal been logged TODAY (independent of other days).
  bool isLoggedToday(String mealId) {
    final now = DateTime.now();
    return _entries
        .any((e) => e.mealId == mealId && e.isSameDay(now));
  }

  List<NutritionPlan> accessiblePlans({required bool premium}) {
    if (premium) return _plans;
    return _plans.where((p) => !p.isPremium).toList();
  }

  Future<void> load() async {
    _loading = true;
    notifyListeners();
    _plans = await _content.getNutritionPlans();
    _loading = false;
    notifyListeners();
  }

  /// Toggle a meal as logged for today. If already logged today, remove
  /// today's entry; otherwise add a fresh one timestamped now.
  Future<void> toggleMealLogged(String mealId) async {
    final now = DateTime.now();
    final hadToday =
        _entries.any((e) => e.mealId == mealId && e.isSameDay(now));
    if (hadToday) {
      _entries.removeWhere(
          (e) => e.mealId == mealId && e.isSameDay(now));
    } else {
      _entries.add(LoggedMealEntry(mealId: mealId, loggedAt: now));
    }
    await _persist();
  }

  Future<void> _persist() async {
    await _storage.writeJson(
      AppConstants.kLoggedMeals,
      _entries.map((e) => e.toJson()).toList(),
    );
    notifyListeners();
  }

  /// Log a meal that isn't part of any plan template (custom user meal).
  /// Adds it to today's totals and persists it across app launches.
  Future<void> logCustomMeal(Meal meal) async {
    // Make sure the custom meal is resolvable when reading back from disk by
    // attaching it to a private "custom" bucket on the current plans state.
    final customIdx = _plans.indexWhere((p) => p.id == 'plan_custom_meals');
    if (customIdx == -1) {
      _plans = [
        ..._plans,
        NutritionPlan(
          id: 'plan_custom_meals',
          title: 'Repas personnalisés',
          description: 'Tes repas loggés à la main.',
          goal: Goal.getFit,
          targetCalories: 0,
          meals: [meal],
        ),
      ];
    } else {
      _plans[customIdx] = _plans[customIdx]
          .copyWith(meals: [..._plans[customIdx].meals, meal]);
    }
    _entries.add(LoggedMealEntry(mealId: meal.id, loggedAt: DateTime.now()));
    await _persist();
  }

  /// Swap a meal inside a plan for a custom one (plans are editable templates).
  void replaceMeal(String planId, Meal oldMeal, Meal newMeal) {
    final i = _plans.indexWhere((p) => p.id == planId);
    if (i == -1) return;
    final meals = _plans[i]
        .meals
        .map((m) => m.id == oldMeal.id ? newMeal : m)
        .toList();
    _plans[i] = _plans[i].copyWith(meals: meals);
    notifyListeners();
  }

  // ---------------------------------------------------------------------
  // Daily totals — used by the "what I ate today" tracker on Home & Nutrition.
  // ---------------------------------------------------------------------

  /// All meals (lookup map by id) across every plan, used to resolve a logged
  /// entry back to its macros.
  Map<String, Meal> get _mealById {
    final m = <String, Meal>{};
    for (final p in _plans) {
      for (final meal in p.meals) {
        m[meal.id] = meal;
      }
    }
    return m;
  }

  List<Meal> mealsLoggedOn(DateTime day) {
    final lookup = _mealById;
    return _entries
        .where((e) => e.isSameDay(day))
        .map((e) => lookup[e.mealId])
        .whereType<Meal>()
        .toList();
  }

  List<Meal> get mealsLoggedToday => mealsLoggedOn(DateTime.now());

  int get todaysKcal => mealsLoggedToday.fold(0, (s, m) => s + m.calories);
  int get todaysProtein => mealsLoggedToday.fold(0, (s, m) => s + m.proteinG);
  int get todaysCarbs => mealsLoggedToday.fold(0, (s, m) => s + m.carbsG);
  int get todaysFat => mealsLoggedToday.fold(0, (s, m) => s + m.fatG);
}
