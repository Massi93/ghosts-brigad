import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../models/user_profile.dart';
import '../../providers/nutrition_provider.dart';

/// Real "what I ate today vs target" card. Reads the day's logged meals from
/// NutritionProvider and the user's targets from their profile.
class DailyNutritionTracker extends StatelessWidget {
  const DailyNutritionTracker({
    super.key,
    required this.profile,
    this.compact = false,
  });

  final UserProfile profile;
  /// `compact: true` → home-screen variant (smaller, less text).
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final nutrition = context.watch<NutritionProvider>();
    final kcalTarget = profile.estimatedDailyCalories.round();
    final proteinTarget = (profile.weightKg * 1.7).round();
    final carbsTarget = (kcalTarget * 0.45 / 4).round();
    final fatTarget = (kcalTarget * 0.25 / 9).round();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.surfaceAlt),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.local_dining,
                  color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              Text(
                compact ? 'Aujourd\'hui' : 'Ma journée nutrition',
                style: const TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 15),
              ),
              const Spacer(),
              if (nutrition.mealsLoggedToday.isEmpty)
                const Text('aucun repas loggé',
                    style: TextStyle(
                        color: AppColors.textMuted, fontSize: 12)),
              if (nutrition.mealsLoggedToday.isNotEmpty)
                Text(
                  '${nutrition.mealsLoggedToday.length} repas',
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 12),
                ),
            ],
          ),
          const SizedBox(height: 12),
          _MacroBar(
            label: 'Calories',
            value: nutrition.todaysKcal,
            target: kcalTarget,
            unit: 'kcal',
            color: AppColors.primary,
          ),
          if (!compact) ...[
            const SizedBox(height: 10),
            _MacroBar(
              label: 'Protéines',
              value: nutrition.todaysProtein,
              target: proteinTarget,
              unit: 'g',
              color: AppColors.secondary,
            ),
            const SizedBox(height: 10),
            _MacroBar(
              label: 'Glucides',
              value: nutrition.todaysCarbs,
              target: carbsTarget,
              unit: 'g',
              color: AppColors.info,
            ),
            const SizedBox(height: 10),
            _MacroBar(
              label: 'Lipides',
              value: nutrition.todaysFat,
              target: fatTarget,
              unit: 'g',
              color: AppColors.warning,
            ),
          ],
        ],
      ),
    );
  }
}

class _MacroBar extends StatelessWidget {
  const _MacroBar({
    required this.label,
    required this.value,
    required this.target,
    required this.unit,
    required this.color,
  });

  final String label;
  final int value;
  final int target;
  final String unit;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final ratio = target == 0 ? 0.0 : (value / target).clamp(0.0, 1.2);
    final pct = (ratio * 100).round();
    final overTarget = value > target;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(label,
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 12)),
            ),
            Text(
              '$value / $target $unit',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: overTarget ? AppColors.error : AppColors.textPrimary,
              ),
            ),
            const SizedBox(width: 8),
            Text('$pct%',
                style: const TextStyle(
                    color: AppColors.textMuted, fontSize: 11)),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(
            value: ratio > 1 ? 1 : ratio.toDouble(),
            minHeight: 6,
            backgroundColor: AppColors.surfaceAlt,
            valueColor: AlwaysStoppedAnimation(
                overTarget ? AppColors.error : color),
          ),
        ),
      ],
    );
  }
}
