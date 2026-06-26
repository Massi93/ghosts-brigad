import '../core/constants/app_constants.dart';

enum MealType { breakfast, lunch, dinner, snack }

extension MealTypeX on MealType {
  String get label => switch (this) {
        MealType.breakfast => 'Petit-déjeuner',
        MealType.lunch => 'Déjeuner',
        MealType.dinner => 'Dîner',
        MealType.snack => 'Collation',
      };
}

/// A single meal within a nutrition plan template.
class Meal {
  final String id;
  final String name;
  final MealType type;
  final int calories;
  final int proteinG;
  final int carbsG;
  final int fatG;
  final List<String> ingredients;
  final String? imageUrl;

  const Meal({
    required this.id,
    required this.name,
    required this.type,
    required this.calories,
    required this.proteinG,
    required this.carbsG,
    required this.fatG,
    this.ingredients = const [],
    this.imageUrl,
  });

  factory Meal.fromJson(Map<String, dynamic> json) => Meal(
        id: json['id'] as String,
        name: json['name'] as String,
        type: MealType.values[(json['type'] as int?) ?? 0],
        calories: (json['calories'] as int?) ?? 0,
        proteinG: (json['proteinG'] as int?) ?? 0,
        carbsG: (json['carbsG'] as int?) ?? 0,
        fatG: (json['fatG'] as int?) ?? 0,
        ingredients: (json['ingredients'] as List?)?.cast<String>() ?? const [],
        imageUrl: json['imageUrl'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'type': type.index,
        'calories': calories,
        'proteinG': proteinG,
        'carbsG': carbsG,
        'fatG': fatG,
        'ingredients': ingredients,
        'imageUrl': imageUrl,
      };
}

/// A full-day, editable nutrition plan built from a template.
class NutritionPlan {
  final String id;
  final String title;
  final String description;
  final Goal goal;
  final int targetCalories;
  final List<Meal> meals;
  final bool isPremium;

  const NutritionPlan({
    required this.id,
    required this.title,
    required this.description,
    required this.goal,
    required this.targetCalories,
    required this.meals,
    this.isPremium = false,
  });

  int get totalCalories => meals.fold(0, (s, m) => s + m.calories);
  int get totalProtein => meals.fold(0, (s, m) => s + m.proteinG);
  int get totalCarbs => meals.fold(0, (s, m) => s + m.carbsG);
  int get totalFat => meals.fold(0, (s, m) => s + m.fatG);

  NutritionPlan copyWith({String? title, List<Meal>? meals}) => NutritionPlan(
        id: id,
        title: title ?? this.title,
        description: description,
        goal: goal,
        targetCalories: targetCalories,
        meals: meals ?? this.meals,
        isPremium: isPremium,
      );

  factory NutritionPlan.fromJson(Map<String, dynamic> json) => NutritionPlan(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String,
        goal: Goal.values[(json['goal'] as int?) ?? 2],
        targetCalories: (json['targetCalories'] as int?) ?? 2000,
        meals: (json['meals'] as List)
            .map((m) => Meal.fromJson(m as Map<String, dynamic>))
            .toList(),
        isPremium: (json['isPremium'] as bool?) ?? false,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'goal': goal.index,
        'targetCalories': targetCalories,
        'meals': meals.map((m) => m.toJson()).toList(),
        'isPremium': isPremium,
      };
}
