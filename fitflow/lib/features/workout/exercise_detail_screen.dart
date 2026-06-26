import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/video_player_widget.dart';
import '../../models/exercise.dart';

class ExerciseDetailScreen extends StatelessWidget {
  const ExerciseDetailScreen({super.key, required this.exercise});
  final Exercise exercise;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(exercise.name)),
      body: ListView(
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(20)),
            child: ExerciseVideoPlayer(url: exercise.videoUrl),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _chip(exercise.muscleGroup.label),
                    const SizedBox(width: 8),
                    _chip(exercise.level.label),
                  ],
                ),
                const SizedBox(height: 16),
                Text(exercise.name,
                    style: const TextStyle(
                        fontSize: 24, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text(exercise.description,
                    style: const TextStyle(
                        color: AppColors.textSecondary, height: 1.5)),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _stat('${exercise.defaultSets}', 'Séries'),
                      _divider(),
                      _stat('${exercise.defaultReps}', 'Reps'),
                      _divider(),
                      _stat('${exercise.estimatedCalories}', 'Kcal'),
                    ],
                  ),
                ),
                if (exercise.tips.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  const Text('Conseils de technique',
                      style: TextStyle(
                          fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  ...exercise.tips.map((t) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.tips_and_updates,
                                color: AppColors.warning, size: 20),
                            const SizedBox(width: 10),
                            Expanded(child: Text(t)),
                          ],
                        ),
                      )),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _chip(String text) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: AppColors.surfaceAlt,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(text,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
      );

  Widget _stat(String value, String label) => Column(
        children: [
          Text(value,
              style: const TextStyle(
                  fontSize: 22, fontWeight: FontWeight.w800)),
          Text(label,
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 12)),
        ],
      );

  Widget _divider() => Container(
      height: 36, width: 1, color: AppColors.surfaceAlt);
}
