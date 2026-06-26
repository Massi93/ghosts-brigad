import 'dart:async';

import 'package:flutter/material.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/common_widgets.dart';
import '../../models/workout_program.dart';
import 'workout_session_controller.dart';

/// Guided, timed workout session. Pops `true` when completed, `false`/null if
/// the user quits early.
class WorkoutSessionScreen extends StatefulWidget {
  const WorkoutSessionScreen({super.key, required this.program});
  final WorkoutProgram program;

  @override
  State<WorkoutSessionScreen> createState() => _WorkoutSessionScreenState();
}

class _WorkoutSessionScreenState extends State<WorkoutSessionScreen> {
  late final WorkoutSessionController _c;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _c = WorkoutSessionController(widget.program);
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _c.tick());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _c.dispose();
    super.dispose();
  }

  Future<void> _confirmQuit() async {
    final wasRunning = _c.isRunning;
    if (wasRunning) _c.togglePlay(); // pause while the dialog is open
    final quit = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Quitter la séance ?'),
        content: const Text('Ta progression de séance ne sera pas validée.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Continuer'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Quitter',
                style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
    if (!mounted) return;
    if (quit == true) {
      Navigator.pop(context, false);
    } else if (wasRunning && !_c.isFinished) {
      _c.togglePlay(); // resume
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _confirmQuit();
      },
      child: Scaffold(
        body: SafeArea(
          child: AnimatedBuilder(
            animation: _c,
            builder: (context, _) {
              if (_c.isFinished) return _FinishView(program: widget.program);
              return _ActiveView(controller: _c, onQuit: _confirmQuit);
            },
          ),
        ),
      ),
    );
  }
}

class _ActiveView extends StatelessWidget {
  const _ActiveView({required this.controller, required this.onQuit});
  final WorkoutSessionController controller;
  final VoidCallback onQuit;

  @override
  Widget build(BuildContext context) {
    final step = controller.current!;
    final isRest = step.isRest;
    final accent = isRest ? AppColors.info : AppColors.primary;

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // Top bar
          Row(
            children: [
              IconButton(
                onPressed: onQuit,
                icon: const Icon(Icons.close),
              ),
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: controller.overallProgress,
                    minHeight: 8,
                    backgroundColor: AppColors.surfaceAlt,
                    valueColor: const AlwaysStoppedAnimation(AppColors.primary),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                '${controller.index + 1}/${controller.totalSteps}',
                style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const Spacer(),

          Text(
            isRest ? 'RÉCUPÉRATION' : 'EN COURS',
            style: TextStyle(
              color: accent,
              fontWeight: FontWeight.w800,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            step.title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
          ),
          if (!isRest) ...[
            const SizedBox(height: 6),
            Text(
              '${step.exercise!.defaultSets} séries × ${step.exercise!.defaultReps} reps',
              style: const TextStyle(color: AppColors.textSecondary),
            ),
          ],
          const SizedBox(height: 28),

          // Countdown ring
          CircularPercentIndicator(
            radius: 110,
            lineWidth: 14,
            percent: controller.stepProgress,
            circularStrokeCap: CircularStrokeCap.round,
            backgroundColor: AppColors.surfaceAlt,
            progressColor: accent,
            center: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '${controller.remaining}',
                  style: const TextStyle(
                      fontSize: 56, fontWeight: FontWeight.w900),
                ),
                const Text('secondes',
                    style: TextStyle(color: AppColors.textSecondary)),
              ],
            ),
          ),
          const SizedBox(height: 20),

          if (controller.next != null) _NextUp(title: controller.next!.title),

          const Spacer(),

          // Controls
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _ctrl(Icons.skip_previous, 'Préc.', controller.previous,
                  enabled: controller.index > 0),
              _PlayButton(
                isRunning: controller.isRunning,
                onTap: controller.togglePlay,
              ),
              _ctrl(Icons.skip_next, 'Passer', controller.skip),
            ],
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }

  Widget _ctrl(IconData icon, String label, VoidCallback onTap,
      {bool enabled = true}) {
    return Opacity(
      opacity: enabled ? 1 : 0.35,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            iconSize: 32,
            onPressed: enabled ? onTap : null,
            icon: Icon(icon, color: AppColors.textPrimary),
          ),
          Text(label,
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 12)),
        ],
      ),
    );
  }
}

class _NextUp extends StatelessWidget {
  const _NextUp({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.arrow_forward,
              size: 16, color: AppColors.textSecondary),
          const SizedBox(width: 8),
          Text('À suivre : ',
              style: const TextStyle(color: AppColors.textSecondary)),
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _PlayButton extends StatelessWidget {
  const _PlayButton({required this.isRunning, required this.onTap});
  final bool isRunning;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 72,
        height: 72,
        decoration: const BoxDecoration(
          gradient: AppColors.primaryGradient,
          shape: BoxShape.circle,
        ),
        child: Icon(
          isRunning ? Icons.pause : Icons.play_arrow,
          color: Colors.black,
          size: 38,
        ),
      ),
    );
  }
}

class _FinishView extends StatelessWidget {
  const _FinishView({required this.program});
  final WorkoutProgram program;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Spacer(),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              gradient: AppColors.primaryGradient,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check, color: Colors.black, size: 64),
          ),
          const SizedBox(height: 24),
          const Text('Séance terminée ! 🎉',
              style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          Text(
            'Tu as bouclé "${program.title}" — ~${program.estimatedCalories} kcal brûlées.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textSecondary),
          ),
          const Spacer(),
          GradientButton(
            label: 'Valider & récupérer mes points',
            icon: Icons.emoji_events,
            onPressed: () => Navigator.pop(context, true),
          ),
        ],
      ),
    );
  }
}
