import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/common_widgets.dart';
import '../../core/widgets/paywall_sheet.dart';
import '../../models/nutrition_plan.dart';
import '../../providers/nutrition_provider.dart';
import '../../providers/user_provider.dart';
import 'daily_nutrition_tracker.dart';
import 'nutrition_plan_screen.dart';

class NutritionScreen extends StatelessWidget {
  const NutritionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final nutrition = context.watch<NutritionProvider>();
    final user = context.watch<UserProvider>();
    final profile = user.profile!;
    final targetKcal = profile.estimatedDailyCalories.round();

    return Scaffold(
      appBar: AppBar(title: const Text('Nutrition')),
      body: nutrition.isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
              children: [
                // Daily target card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Ton besoin calorique estimé',
                          style: TextStyle(
                              color: Colors.black87,
                              fontWeight: FontWeight.w600)),
                      const SizedBox(height: 6),
                      Text('$targetKcal kcal / jour',
                          style: const TextStyle(
                              color: Colors.black,
                              fontSize: 30,
                              fontWeight: FontWeight.w900)),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _macro('Protéines',
                              '${(profile.weightKg * 1.7).round()}g'),
                          _macro('Glucides',
                              '${(targetKcal * 0.45 / 4).round()}g'),
                          _macro('Lipides',
                              '${(targetKcal * 0.25 / 9).round()}g'),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                DailyNutritionTracker(profile: profile),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: StatCard(
                        icon: Icons.restaurant_menu,
                        value: '${nutrition.loggedMealCount}',
                        label: 'Repas loggés',
                        color: AppColors.secondary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: StatCard(
                        icon: Icons.eco,
                        value: '${nutrition.accessiblePlans(premium: user.isPremium).length}',
                        label: 'Plans dispo',
                        color: AppColors.success,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                const SectionHeader(title: 'Plans alimentaires'),
                ...nutrition.plans.map((p) => Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: _PlanCard(
                        plan: p,
                        locked: p.isPremium && !user.isPremium,
                      ),
                    )),
              ],
            ),
    );
  }

  Widget _macro(String label, String value) => Column(
        children: [
          Text(value,
              style: const TextStyle(
                  color: Colors.black,
                  fontSize: 16,
                  fontWeight: FontWeight.w800)),
          Text(label,
              style: const TextStyle(color: Colors.black87, fontSize: 12)),
        ],
      );
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({required this.plan, required this.locked});
  final NutritionPlan plan;
  final bool locked;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        if (locked) {
          PaywallSheet.show(context,
              reason: 'Ce plan nutrition est réservé aux membres Premium.');
        } else {
          Navigator.push(
            context,
            MaterialPageRoute(
                builder: (_) => NutritionPlanScreen(plan: plan)),
          );
        }
      },
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(18),
        ),
        clipBehavior: Clip.antiAlias,
        child: Row(
          children: [
            Stack(
              children: [
                CachedNetworkImage(
                  imageUrl: plan.meals.first.imageUrl ?? '',
                  width: 110,
                  height: 120,
                  fit: BoxFit.cover,
                  errorWidget: (_, __, ___) => Container(
                    width: 110,
                    height: 120,
                    color: AppColors.surfaceAlt,
                    child: const Icon(Icons.restaurant,
                        color: AppColors.textMuted),
                  ),
                ),
                if (locked)
                  Positioned.fill(
                    child: Container(
                      color: Colors.black.withOpacity(0.5),
                      child: const Icon(Icons.lock, color: Colors.white),
                    ),
                  ),
              ],
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(plan.title,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800, fontSize: 16)),
                        ),
                        if (plan.isPremium) const PremiumTag(compact: true),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(plan.description,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            color: AppColors.textSecondary, fontSize: 12)),
                    const SizedBox(height: 8),
                    Text(
                      '${plan.targetCalories} kcal · ${plan.meals.length} repas',
                      style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
