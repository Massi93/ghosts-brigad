import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/common_widgets.dart';
import '../../core/widgets/paywall_sheet.dart';
import '../../providers/gamification_provider.dart';
import '../../providers/progress_provider.dart';
import '../../providers/user_provider.dart';
import '../../providers/workout_provider.dart';
import '../../services/ai_coach_service.dart';
import '../coach/coach_screen.dart';
import '../nutrition/daily_nutrition_tracker.dart';
import '../profile/profile_screen.dart';
import '../workout/program_detail_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<UserProvider>();
    final game = context.watch<GamificationProvider>();
    final progress = context.watch<ProgressProvider>();
    final workout = context.watch<WorkoutProvider>();
    final profile = user.profile!;
    final tip = AiCoachService().dailyTip(profile);

    final recommended = workout.programs.isEmpty
        ? null
        : workout.programs.firstWhere(
            (p) => p.level == profile.level && !p.isPremium,
            orElse: () => workout.programs.first,
          );

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
          children: [
            // Header
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Salut, ${profile.name} 👋',
                          style: const TextStyle(
                              fontSize: 24, fontWeight: FontWeight.w800)),
                      const Text('Prêt à te dépasser aujourd\'hui ?',
                          style: TextStyle(color: AppColors.textSecondary)),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => const ProfileScreen()),
                  ),
                  child: CircleAvatar(
                    radius: 24,
                    backgroundColor: AppColors.primary,
                    child: Text(
                      profile.name.isNotEmpty
                          ? profile.name[0].toUpperCase()
                          : '?',
                      style: const TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.bold,
                          fontSize: 20),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            _LevelCard(game: game),
            const SizedBox(height: 16),

            // Daily AI tip
            GestureDetector(
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CoachScreen()),
              ),
              child: Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: AppColors.energyGradient,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.psychology, color: Colors.white, size: 30),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Conseil du Coach Flow',
                              style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text(tip,
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: Colors.white),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Today's nutrition tracker (compact)
            DailyNutritionTracker(profile: profile, compact: true),
            const SizedBox(height: 16),

            // Quick stats
            Row(
              children: [
                Expanded(
                  child: StatCard(
                    icon: Icons.local_fire_department,
                    value: '${game.state.streakDays}',
                    label: 'Jours de série',
                    color: AppColors.secondary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: StatCard(
                    icon: Icons.fitness_center,
                    value: '${workout.completedCount}',
                    label: 'Séances',
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: StatCard(
                    icon: Icons.bolt,
                    value: '${progress.totalCaloriesBurned}',
                    label: 'Kcal brûlées',
                    color: AppColors.info,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Recommended workout
            if (recommended != null) ...[
              const SectionHeader(title: 'Recommandé pour toi'),
              GestureDetector(
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) =>
                        ProgramDetailScreen(program: recommended),
                  ),
                ),
                child: Container(
                  height: 170,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    image: DecorationImage(
                      image: NetworkImage(recommended.coverUrl),
                      fit: BoxFit.cover,
                      colorFilter: ColorFilter.mode(
                        Colors.black.withOpacity(0.4),
                        BlendMode.darken,
                      ),
                      onError: (_, __) {},
                    ),
                    color: AppColors.card,
                  ),
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(recommended.level.label,
                            style: const TextStyle(
                                color: Colors.black,
                                fontSize: 11,
                                fontWeight: FontWeight.bold)),
                      ),
                      const SizedBox(height: 8),
                      Text(recommended.title,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.w800)),
                      Text(
                        '${recommended.durationMinutes} min · ${recommended.estimatedCalories} kcal · ${recommended.exerciseCount} exos',
                        style: const TextStyle(color: Colors.white70),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Active challenge
            if (game.challenges.isNotEmpty) ...[
              const SectionHeader(title: 'Défi en cours'),
              _ChallengeCard(challenge: game.challenges.first),
              const SizedBox(height: 24),
            ],

            // Premium upsell
            if (!user.isPremium)
              GestureDetector(
                onTap: () => PaywallSheet.show(context),
                child: Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: AppColors.premiumGradient,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.workspace_premium,
                          color: Colors.black, size: 32),
                      SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Passe Premium',
                                style: TextStyle(
                                    color: Colors.black,
                                    fontSize: 17,
                                    fontWeight: FontWeight.w800)),
                            Text(
                                'Programmes illimités, coach IA sans limite & plus',
                                style: TextStyle(
                                    color: Colors.black87, fontSize: 12)),
                          ],
                        ),
                      ),
                      Icon(Icons.arrow_forward, color: Colors.black),
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

class _LevelCard extends StatelessWidget {
  const _LevelCard({required this.game});
  final GamificationProvider game;

  @override
  Widget build(BuildContext context) {
    final s = game.state;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: Colors.black.withOpacity(0.2),
                child: Text('${s.level}',
                    style: const TextStyle(
                        color: Colors.black,
                        fontWeight: FontWeight.w900,
                        fontSize: 22)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Niveau ${s.level}',
                        style: const TextStyle(
                            color: Colors.black,
                            fontWeight: FontWeight.w800,
                            fontSize: 18)),
                    Text('${s.points} points · ${game.unlockedBadgeCount} badges',
                        style: const TextStyle(color: Colors.black87)),
                  ],
                ),
              ),
              const Icon(Icons.emoji_events, color: Colors.black, size: 28),
            ],
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: s.levelProgress,
              minHeight: 8,
              backgroundColor: Colors.black.withOpacity(0.2),
              valueColor:
                  const AlwaysStoppedAnimation(Colors.black),
            ),
          ),
          const SizedBox(height: 6),
          Align(
            alignment: Alignment.centerRight,
            child: Text('${s.pointsIntoLevel}/500 vers niveau ${s.level + 1}',
                style: const TextStyle(color: Colors.black87, fontSize: 11)),
          ),
        ],
      ),
    );
  }
}

class _ChallengeCard extends StatelessWidget {
  const _ChallengeCard({required this.challenge});
  final dynamic challenge;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.accent.withOpacity(0.15),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(challenge.icon, color: AppColors.accent),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(challenge.title,
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(challenge.description,
                    style: const TextStyle(
                        color: AppColors.textSecondary, fontSize: 12)),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: challenge.progress as double,
                    minHeight: 6,
                    backgroundColor: AppColors.surfaceAlt,
                    valueColor:
                        const AlwaysStoppedAnimation(AppColors.accent),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            children: [
              const Icon(Icons.stars, color: AppColors.gold, size: 18),
              Text('+${challenge.rewardPoints}',
                  style: const TextStyle(
                      fontSize: 12, fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }
}
