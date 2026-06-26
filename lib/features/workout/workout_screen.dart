import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/common_widgets.dart';
import '../../core/widgets/paywall_sheet.dart';
import '../../models/workout_program.dart';
import '../../providers/user_provider.dart';
import '../../providers/workout_provider.dart';
import 'program_detail_screen.dart';

class WorkoutScreen extends StatefulWidget {
  const WorkoutScreen({super.key});

  @override
  State<WorkoutScreen> createState() => _WorkoutScreenState();
}

class _WorkoutScreenState extends State<WorkoutScreen> {
  FitnessLevel? _levelFilter;

  @override
  Widget build(BuildContext context) {
    final workout = context.watch<WorkoutProvider>();
    final premium = context.watch<UserProvider>().isPremium;

    var programs = workout.programs;
    if (_levelFilter != null) {
      programs = programs.where((p) => p.level == _levelFilter).toList();
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Entraînement')),
      body: workout.isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
              children: [
                if (!premium)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 16),
                    child: _FreeBanner(
                      text:
                          'Version gratuite : accès aux programmes & ${AppConstants.freeExerciseLimit} exercices de base.',
                    ),
                  ),
                // Level filter chips
                SizedBox(
                  height: 40,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      _FilterChip(
                        label: 'Tous',
                        selected: _levelFilter == null,
                        onTap: () => setState(() => _levelFilter = null),
                      ),
                      ...FitnessLevel.values.map((l) => _FilterChip(
                            label: l.label,
                            selected: _levelFilter == l,
                            onTap: () => setState(() => _levelFilter = l),
                          )),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                ...programs.map((p) => Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: _ProgramCard(
                        program: p,
                        locked: p.isPremium && !premium,
                        completed: workout.isCompleted(p.id),
                      ),
                    )),
              ],
            ),
    );
  }
}

class _FreeBanner extends StatelessWidget {
  const _FreeBanner({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline, size: 18, color: AppColors.info),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text,
                style: const TextStyle(
                    fontSize: 12, color: AppColors.textSecondary)),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip(
      {required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? AppColors.primary : AppColors.surfaceAlt,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(label,
              style: TextStyle(
                  color: selected ? Colors.black : AppColors.textSecondary,
                  fontWeight: FontWeight.w600)),
        ),
      ),
    );
  }
}

class _ProgramCard extends StatelessWidget {
  const _ProgramCard({
    required this.program,
    required this.locked,
    required this.completed,
  });
  final WorkoutProgram program;
  final bool locked;
  final bool completed;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        if (locked) {
          PaywallSheet.show(context,
              reason: 'Ce programme est réservé aux membres Premium.');
        } else {
          Navigator.push(
            context,
            MaterialPageRoute(
                builder: (_) => ProgramDetailScreen(program: program)),
          );
        }
      },
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(20),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                CachedNetworkImage(
                  imageUrl: program.coverUrl,
                  height: 140,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  placeholder: (_, __) => Container(
                      height: 140, color: AppColors.surfaceAlt),
                  errorWidget: (_, __, ___) => Container(
                    height: 140,
                    color: AppColors.surfaceAlt,
                    child: const Icon(Icons.fitness_center,
                        color: AppColors.textMuted, size: 40),
                  ),
                ),
                if (program.isPremium)
                  const Positioned(
                      top: 12, right: 12, child: PremiumTag(compact: true)),
                if (locked)
                  Positioned.fill(
                    child: Container(
                      color: Colors.black.withOpacity(0.55),
                      child: const Center(
                        child: Icon(Icons.lock,
                            color: Colors.white, size: 36),
                      ),
                    ),
                  ),
                if (completed)
                  Positioned(
                    top: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.check, size: 13, color: Colors.black),
                          SizedBox(width: 4),
                          Text('Terminé',
                              style: TextStyle(
                                  color: Colors.black,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(program.title,
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text(program.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 13)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _meta(Icons.timer, '${program.durationMinutes} min'),
                      const SizedBox(width: 16),
                      _meta(Icons.local_fire_department,
                          '${program.estimatedCalories} kcal'),
                      const SizedBox(width: 16),
                      _meta(Icons.list, '${program.exerciseCount} exos'),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _meta(IconData icon, String text) => Row(
        children: [
          Icon(icon, size: 16, color: AppColors.primary),
          const SizedBox(width: 4),
          Text(text,
              style: const TextStyle(
                  fontSize: 12, color: AppColors.textSecondary)),
        ],
      );
}
