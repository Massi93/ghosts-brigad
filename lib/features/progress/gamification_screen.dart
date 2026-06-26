import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/common_widgets.dart';
import '../../models/gamification.dart';
import '../../providers/gamification_provider.dart';

class GamificationScreen extends StatelessWidget {
  const GamificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final game = context.watch<GamificationProvider>();
    final badges = game.badges;
    final s = game.state;

    return Scaffold(
      appBar: AppBar(title: const Text('Récompenses')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          // Points hero
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: AppColors.premiumGradient,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${s.points}',
                        style: const TextStyle(
                            color: Colors.black,
                            fontSize: 34,
                            fontWeight: FontWeight.w900)),
                    const Text('points totaux',
                        style: TextStyle(color: Colors.black87)),
                  ],
                ),
                const Spacer(),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('Niveau ${s.level}',
                        style: const TextStyle(
                            color: Colors.black,
                            fontSize: 20,
                            fontWeight: FontWeight.w800)),
                    Text('${game.unlockedBadgeCount}/${badges.length} badges',
                        style: const TextStyle(color: Colors.black87)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const SectionHeader(title: 'Défis'),
          ...game.challenges.map((c) => _ChallengeRow(challenge: c)),
          const SizedBox(height: 24),
          const SectionHeader(title: 'Badges'),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 0.82,
            children: badges.map((b) => _BadgeTile(badge: b)).toList(),
          ),
        ],
      ),
    );
  }
}

class _ChallengeRow extends StatelessWidget {
  const _ChallengeRow({required this.challenge});
  final Challenge challenge;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: (challenge.isComplete
                      ? AppColors.primary
                      : AppColors.accent)
                  .withOpacity(0.15),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(challenge.icon,
                color: challenge.isComplete
                    ? AppColors.primary
                    : AppColors.accent),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(challenge.title,
                          style:
                              const TextStyle(fontWeight: FontWeight.w700)),
                    ),
                    if (challenge.isComplete)
                      const Icon(Icons.check_circle,
                          color: AppColors.primary, size: 18),
                  ],
                ),
                const SizedBox(height: 2),
                Text(challenge.description,
                    style: const TextStyle(
                        color: AppColors.textSecondary, fontSize: 12)),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: challenge.progress,
                    minHeight: 6,
                    backgroundColor: AppColors.surfaceAlt,
                    valueColor: AlwaysStoppedAnimation(
                        challenge.isComplete
                            ? AppColors.primary
                            : AppColors.accent),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${challenge.currentValue}/${challenge.targetValue} · +${challenge.rewardPoints} pts',
                  style: const TextStyle(
                      color: AppColors.textMuted, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BadgeTile extends StatelessWidget {
  const _BadgeTile({required this.badge});
  final AchievementBadge badge;

  Color get _tierColor => switch (badge.tier) {
        BadgeTier.gold => AppColors.gold,
        BadgeTier.silver => AppColors.silver,
        BadgeTier.bronze => AppColors.bronze,
      };

  @override
  Widget build(BuildContext context) {
    final unlocked = badge.unlocked;
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: unlocked ? _tierColor : AppColors.surfaceAlt,
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: unlocked
                  ? _tierColor.withOpacity(0.18)
                  : AppColors.surfaceAlt,
              shape: BoxShape.circle,
            ),
            child: Icon(
              unlocked ? badge.icon : Icons.lock,
              color: unlocked ? _tierColor : AppColors.textMuted,
              size: 26,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            badge.title,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: unlocked ? AppColors.textPrimary : AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}
