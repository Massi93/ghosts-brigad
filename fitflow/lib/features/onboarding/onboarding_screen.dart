import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/common_widgets.dart';
import '../../providers/user_provider.dart';

/// Multi-step onboarding that captures the data the AI coach needs.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _page = 0;

  Goal _goal = Goal.getFit;
  FitnessLevel _level = FitnessLevel.beginner;
  double _age = 28;
  double _height = 175;
  double _weight = 72;

  void _next() {
    if (_page < 2) {
      _controller.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    } else {
      context.read<UserProvider>().completeOnboarding(
            age: _age.round(),
            heightCm: _height,
            weightKg: _weight,
            level: _level,
            goal: _goal,
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: List.generate(
                  3,
                  (i) => Expanded(
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      height: 6,
                      decoration: BoxDecoration(
                        color: i <= _page
                            ? AppColors.primary
                            : AppColors.surfaceAlt,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Expanded(
              child: PageView(
                controller: _controller,
                physics: const NeverScrollableScrollPhysics(),
                onPageChanged: (i) => setState(() => _page = i),
                children: [
                  _GoalStep(
                    selected: _goal,
                    onSelect: (g) => setState(() => _goal = g),
                  ),
                  _LevelStep(
                    selected: _level,
                    onSelect: (l) => setState(() => _level = l),
                  ),
                  _BodyStep(
                    age: _age,
                    height: _height,
                    weight: _weight,
                    onAge: (v) => setState(() => _age = v),
                    onHeight: (v) => setState(() => _height = v),
                    onWeight: (v) => setState(() => _weight = v),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: GradientButton(
                label: _page == 2 ? 'C\'est parti !' : 'Continuer',
                icon: _page == 2 ? Icons.check : Icons.arrow_forward,
                onPressed: _next,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StepScaffold extends StatelessWidget {
  const _StepScaffold(
      {required this.title, required this.subtitle, required this.child});
  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  fontSize: 26, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text(subtitle,
              style: const TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 28),
          Expanded(child: child),
        ],
      ),
    );
  }
}

class _GoalStep extends StatelessWidget {
  const _GoalStep({required this.selected, required this.onSelect});
  final Goal selected;
  final ValueChanged<Goal> onSelect;

  @override
  Widget build(BuildContext context) {
    return _StepScaffold(
      title: 'Quel est ton objectif ?',
      subtitle: 'On personnalise ton coaching en conséquence.',
      child: ListView(
        children: Goal.values.map((g) {
          final isSel = g == selected;
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: GestureDetector(
              onTap: () => onSelect(g),
              child: Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: isSel
                      ? AppColors.primary.withOpacity(0.15)
                      : AppColors.card,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isSel ? AppColors.primary : Colors.transparent,
                    width: 1.5,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(_goalIcon(g),
                        color: isSel
                            ? AppColors.primary
                            : AppColors.textSecondary),
                    const SizedBox(width: 14),
                    Text(g.label,
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w600)),
                    const Spacer(),
                    if (isSel)
                      const Icon(Icons.check_circle,
                          color: AppColors.primary),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  IconData _goalIcon(Goal g) => switch (g) {
        Goal.loseWeight => Icons.monitor_weight,
        Goal.buildMuscle => Icons.fitness_center,
        Goal.getFit => Icons.favorite,
        Goal.gainStrength => Icons.sports_mma,
        Goal.endurance => Icons.directions_run,
      };
}

class _LevelStep extends StatelessWidget {
  const _LevelStep({required this.selected, required this.onSelect});
  final FitnessLevel selected;
  final ValueChanged<FitnessLevel> onSelect;

  @override
  Widget build(BuildContext context) {
    const descriptions = {
      FitnessLevel.beginner: 'Je commence ou je reprends le sport.',
      FitnessLevel.intermediate: 'Je m\'entraîne régulièrement.',
      FitnessLevel.professional: 'Je m\'entraîne intensément depuis des années.',
    };
    return _StepScaffold(
      title: 'Ton niveau actuel ?',
      subtitle: 'Pour adapter la difficulté des programmes.',
      child: ListView(
        children: FitnessLevel.values.map((l) {
          final isSel = l == selected;
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: GestureDetector(
              onTap: () => onSelect(l),
              child: Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: isSel
                      ? AppColors.primary.withOpacity(0.15)
                      : AppColors.card,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isSel ? AppColors.primary : Colors.transparent,
                    width: 1.5,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l.label,
                        style: const TextStyle(
                            fontSize: 17, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text(descriptions[l]!,
                        style: const TextStyle(
                            color: AppColors.textSecondary, fontSize: 13)),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _BodyStep extends StatelessWidget {
  const _BodyStep({
    required this.age,
    required this.height,
    required this.weight,
    required this.onAge,
    required this.onHeight,
    required this.onWeight,
  });

  final double age, height, weight;
  final ValueChanged<double> onAge, onHeight, onWeight;

  @override
  Widget build(BuildContext context) {
    return _StepScaffold(
      title: 'Parle-nous de toi',
      subtitle: 'Ces infos affinent tes besoins caloriques.',
      child: ListView(
        children: [
          _slider('Âge', '${age.round()} ans', age, 14, 90, onAge),
          _slider('Taille', '${height.round()} cm', height, 130, 220, onHeight),
          _slider('Poids', '${weight.round()} kg', weight, 35, 180, onWeight),
        ],
      ),
    );
  }

  Widget _slider(String label, String value, double current, double min,
      double max, ValueChanged<double> onChanged) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label,
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w600)),
              Text(value,
                  style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 18,
                      fontWeight: FontWeight.w700)),
            ],
          ),
          Slider(
            value: current,
            min: min,
            max: max,
            activeColor: AppColors.primary,
            inactiveColor: AppColors.surfaceAlt,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}
