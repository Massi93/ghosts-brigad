import 'package:flutter/foundation.dart';

import '../core/constants/app_constants.dart';
import '../models/nutrition_plan.dart';
import '../services/content_service.dart';
import '../services/storage_service.dart';

/// Loads nutrition plan templates and tracks logged meals.
class NutritionProvider extends ChangeNotifier {
  NutritionProvider(this._content, this._storage) {
    load();
    _loggedMealIds =
        (_storage.readJsonList(AppConstants.kLoggedMeals) ?? [])
            .cast<String>()
            .toList();
  }

  final ContentService _content;
  final StorageService _storage;

  List<NutritionPlan> _plans = [];
  List<String> _loggedMealIds = [];
  bool _loading = true;

  List<NutritionPlan> get plans => _plans;
  bool get isLoading => _loading;
  int get loggedMealCount => _loggedMealIds.length;

  bool isLogged(String mealId) => _loggedMealIds.contains(mealId);

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

  Future<void> toggleMealLogged(String mealId) async {
    if (_loggedMealIds.contains(mealId)) {
      _loggedMealIds.remove(mealId);
    } else {
      _loggedMealIds.add(mealId);
    }
    await _storage.writeJson(AppConstants.kLoggedMeals, _loggedMealIds);
    notifyListeners();
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
}
