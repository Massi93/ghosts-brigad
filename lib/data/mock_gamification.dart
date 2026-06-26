import 'package:flutter/material.dart';
import '../models/gamification.dart';

const List<AchievementBadge> kBadges = [
  AchievementBadge(
    id: 'badge_first_workout',
    title: 'Premier Pas',
    description: 'Termine ton tout premier entraînement.',
    icon: Icons.directions_run,
    tier: BadgeTier.bronze,
  ),
  AchievementBadge(
    id: 'badge_streak_3',
    title: 'Sur la Lancée',
    description: '3 jours d\'activité consécutifs.',
    icon: Icons.local_fire_department,
    tier: BadgeTier.bronze,
  ),
  AchievementBadge(
    id: 'badge_streak_7',
    title: 'Semaine Parfaite',
    description: '7 jours d\'affilée. Discipline !',
    icon: Icons.calendar_today,
    tier: BadgeTier.silver,
  ),
  AchievementBadge(
    id: 'badge_10_workouts',
    title: 'Régulier',
    description: '10 entraînements terminés.',
    icon: Icons.fitness_center,
    tier: BadgeTier.silver,
  ),
  AchievementBadge(
    id: 'badge_nutrition',
    title: 'Mangeur Avisé',
    description: 'Suis un plan nutrition pendant 5 jours.',
    icon: Icons.restaurant,
    tier: BadgeTier.silver,
  ),
  AchievementBadge(
    id: 'badge_level_5',
    title: 'Machine',
    description: 'Atteins le niveau 5.',
    icon: Icons.military_tech,
    tier: BadgeTier.gold,
  ),
  AchievementBadge(
    id: 'badge_50_workouts',
    title: 'Athlète Élite',
    description: '50 entraînements. Respect !',
    icon: Icons.emoji_events,
    tier: BadgeTier.gold,
  ),
];

const List<Challenge> kChallenges = [
  Challenge(
    id: 'ch_week3',
    title: 'Défi de la Semaine',
    description: 'Réalise 3 entraînements cette semaine.',
    targetValue: 3,
    rewardPoints: 150,
    icon: Icons.flag,
  ),
  Challenge(
    id: 'ch_hydration',
    title: 'Hydratation',
    description: 'Log tes repas 5 jours d\'affilée.',
    targetValue: 5,
    rewardPoints: 100,
    icon: Icons.water_drop,
  ),
  Challenge(
    id: 'ch_calories',
    title: 'Brûleur',
    description: 'Brûle 1000 kcal au total cette semaine.',
    targetValue: 1000,
    rewardPoints: 200,
    icon: Icons.whatshot,
  ),
];
