import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../models/nutrition_plan.dart';
import '../../providers/gamification_provider.dart';
import '../../providers/nutrition_provider.dart';

class NutritionPlanScreen extends StatelessWidget {
  const NutritionPlanScreen({super.key, required this.plan});
  final NutritionPlan plan;

  @override
  Widget build(BuildContext context) {
    final nutrition = context.watch<NutritionProvider>();
    // Use the up-to-date plan from the provider (meals may be edited).
    final current = nutrition.plans.firstWhere((p) => p.id == plan.id,
        orElse: () => plan);

    return Scaffold(
      appBar: AppBar(title: Text(current.title)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          Text(current.description,
              style: const TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 16),
          // Macro summary
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _macro('${current.totalCalories}', 'kcal', AppColors.primary),
                _macro('${current.totalProtein}g', 'Protéines',
                    AppColors.secondary),
                _macro('${current.totalCarbs}g', 'Glucides', AppColors.info),
                _macro('${current.totalFat}g', 'Lipides', AppColors.warning),
              ],
            ),
          ),
          const SizedBox(height: 24),
          ...current.meals.map((m) => _MealCard(
                meal: m,
                logged: nutrition.isLogged(m.id),
                onToggle: () async {
                  final game = context.read<GamificationProvider>();
                  await nutrition.toggleMealLogged(m.id);
                  if (nutrition.isLogged(m.id)) {
                    await game.addPoints(AppConstants.pointsPerMealLogged);
                    await game.progressChallenge('ch_hydration', 1);
                  }
                },
              )),
          const SizedBox(height: 8),
          Center(
            child: Text(
              'Plan modifiable — appuie longuement sur un repas pour le remplacer (template).',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: AppColors.textMuted.withOpacity(0.8), fontSize: 11),
            ),
          ),
        ],
      ),
    );
  }

  Widget _macro(String value, String label, Color color) => Column(
        children: [
          Text(value,
              style: TextStyle(
                  fontSize: 18, fontWeight: FontWeight.w800, color: color)),
          Text(label,
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 11)),
        ],
      );
}

class _MealCard extends StatelessWidget {
  const _MealCard(
      {required this.meal, required this.logged, required this.onToggle});
  final Meal meal;
  final bool logged;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: logged ? AppColors.primary : Colors.transparent,
          width: 1.5,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              CachedNetworkImage(
                imageUrl: meal.imageUrl ?? '',
                height: 130,
                width: double.infinity,
                fit: BoxFit.cover,
                errorWidget: (_, __, ___) => Container(
                  height: 130,
                  color: AppColors.surfaceAlt,
                  child: const Icon(Icons.restaurant,
                      color: AppColors.textMuted, size: 36),
                ),
              ),
              Positioned(
                top: 10,
                left: 10,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.6),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(meal.type.label,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(meal.name,
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 14,
                  children: [
                    _tag('${meal.calories} kcal', AppColors.primary),
                    _tag('P ${meal.proteinG}g', AppColors.secondary),
                    _tag('G ${meal.carbsG}g', AppColors.info),
                    _tag('L ${meal.fatG}g', AppColors.warning),
                  ],
                ),
                if (meal.ingredients.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(meal.ingredients.join(' · '),
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 12)),
                ],
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: onToggle,
                    icon: Icon(
                        logged ? Icons.check_circle : Icons.add_circle_outline,
                        color: logged
                            ? AppColors.primary
                            : AppColors.textSecondary),
                    label: Text(logged ? 'Repas loggé' : 'Logger ce repas',
                        style: TextStyle(
                            color: logged
                                ? AppColors.primary
                                : AppColors.textPrimary)),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(
                          color: logged
                              ? AppColors.primary
                              : AppColors.surfaceAlt),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _tag(String text, Color color) => Text(text,
      style: TextStyle(
          color: color, fontSize: 12, fontWeight: FontWeight.w700));
}
