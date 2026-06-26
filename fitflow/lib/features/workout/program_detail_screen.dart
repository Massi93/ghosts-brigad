import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/common_widgets.dart';
import '../../models/exercise.dart';
import '../../models/workout_program.dart';
import '../../providers/gamification_provider.dart';
import '../../providers/progress_provider.dart';
import '../../providers/workout_provider.dart';
import 'exercise_detail_screen.dart';

class ProgramDetailScreen extends StatelessWidget {
  const ProgramDetailScreen({super.key, required this.program});
  final WorkoutProgram program;

  Future<void> _finish(BuildContext context) async {
    await context.read<WorkoutProvider>().markCompleted(program.id);
    await context
        .read<GamificationProvider>()
        .addPoints(AppConstants.pointsPerWorkout);
    await context.read<GamificationProvider>().unlockBadge('badge_first_workout');
    await context
        .read<GamificationProvider>()
        .progressChallenge('ch_week3', 1);
    await context.read<ProgressProvider>().addEntry(
          weightKg: context.read<ProgressProvider>().latestWeight ?? 72,
          workoutsCompleted: 1,
          caloriesBurned: program.estimatedCalories,
        );
    if (!context.mounted) return;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Séance terminée ! 🎉'),
        content: Text(
            'Bravo ! Tu as gagné +${AppConstants.pointsPerWorkout} points et brûlé ~${program.estimatedCalories} kcal.'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            child: const Text('Super !'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 240,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  CachedNetworkImage(
                    imageUrl: program.coverUrl,
                    fit: BoxFit.cover,
                    errorWidget: (_, __, ___) =>
                        Container(color: AppColors.surfaceAlt),
                  ),
                  const DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, AppColors.background],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.all(20),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                Row(
                  children: [
                    _Pill(text: program.level.label),
                    const SizedBox(width: 8),
                    _Pill(text: program.focus.label),
                    if (program.isPremium) ...[
                      const SizedBox(width: 8),
                      const PremiumTag(compact: true),
                    ],
                  ],
                ),
                const SizedBox(height: 14),
                Text(program.title,
                    style: const TextStyle(
                        fontSize: 26, fontWeight: FontWeight.w900)),
                const SizedBox(height: 8),
                Text(program.description,
                    style: const TextStyle(color: AppColors.textSecondary)),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _stat(Icons.timer, '${program.durationMinutes}',
                        'minutes'),
                    _stat(Icons.local_fire_department,
                        '${program.estimatedCalories}', 'kcal'),
                    _stat(Icons.fitness_center, '${program.exerciseCount}',
                        'exercices'),
                  ],
                ),
                const SizedBox(height: 24),
                const SectionHeader(title: 'Exercices'),
                ...program.exercises.asMap().entries.map((e) =>
                    _ExerciseTile(index: e.key + 1, exercise: e.value)),
                const SizedBox(height: 24),
                GradientButton(
                  label: 'Démarrer & terminer la séance',
                  icon: Icons.play_arrow,
                  onPressed: () => _finish(context),
                ),
                const SizedBox(height: 12),
                const Center(
                  child: Text(
                    'Échauffe-toi 5 min avant de commencer 💪',
                    style: TextStyle(
                        color: AppColors.textMuted, fontSize: 12),
                  ),
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _stat(IconData icon, String value, String label) => Column(
        children: [
          Icon(icon, color: AppColors.primary),
          const SizedBox(height: 6),
          Text(value,
              style: const TextStyle(
                  fontSize: 20, fontWeight: FontWeight.w800)),
          Text(label,
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 12)),
        ],
      );
}

class _Pill extends StatelessWidget {
  const _Pill({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(text,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }
}

class _ExerciseTile extends StatelessWidget {
  const _ExerciseTile({required this.index, required this.exercise});
  final int index;
  final Exercise exercise;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
              builder: (_) => ExerciseDetailScreen(exercise: exercise)),
        ),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: CachedNetworkImage(
                  imageUrl: exercise.thumbnailUrl,
                  width: 60,
                  height: 60,
                  fit: BoxFit.cover,
                  errorWidget: (_, __, ___) => Container(
                    width: 60,
                    height: 60,
                    color: AppColors.surfaceAlt,
                    child: const Icon(Icons.play_circle,
                        color: AppColors.primary),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('$index. ${exercise.name}',
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text(
                      '${exercise.defaultSets} séries × ${exercise.defaultReps} reps',
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 13),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}
