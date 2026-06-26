import 'package:flutter/material.dart';

enum BadgeTier { bronze, silver, gold }

/// An unlockable achievement badge.
class AchievementBadge {
  final String id;
  final String title;
  final String description;
  final IconData icon;
  final BadgeTier tier;
  final bool unlocked;

  const AchievementBadge({
    required this.id,
    required this.title,
    required this.description,
    required this.icon,
    this.tier = BadgeTier.bronze,
    this.unlocked = false,
  });

  AchievementBadge copyWith({bool? unlocked}) => AchievementBadge(
        id: id,
        title: title,
        description: description,
        icon: icon,
        tier: tier,
        unlocked: unlocked ?? this.unlocked,
      );
}

/// A time-bound challenge that rewards points on completion.
class Challenge {
  final String id;
  final String title;
  final String description;
  final int targetValue;
  final int rewardPoints;
  final IconData icon;
  final int currentValue;

  const Challenge({
    required this.id,
    required this.title,
    required this.description,
    required this.targetValue,
    required this.rewardPoints,
    required this.icon,
    this.currentValue = 0,
  });

  double get progress {
    if (targetValue == 0) return 0;
    final ratio = currentValue / targetValue;
    return ratio < 0 ? 0 : (ratio > 1 ? 1 : ratio);
  }
  bool get isComplete => currentValue >= targetValue;

  Challenge copyWith({int? currentValue}) => Challenge(
        id: id,
        title: title,
        description: description,
        targetValue: targetValue,
        rewardPoints: rewardPoints,
        icon: icon,
        currentValue: currentValue ?? this.currentValue,
      );
}

/// Aggregated gamification state for the user.
class GamificationState {
  final int points;
  final int streakDays;
  final DateTime? lastActivity;
  final Set<String> unlockedBadgeIds;

  const GamificationState({
    this.points = 0,
    this.streakDays = 0,
    this.lastActivity,
    this.unlockedBadgeIds = const {},
  });

  /// Level scales with total points (every 500 pts = 1 level).
  int get level => 1 + (points ~/ 500);
  int get pointsIntoLevel => points % 500;
  double get levelProgress => pointsIntoLevel / 500;

  GamificationState copyWith({
    int? points,
    int? streakDays,
    DateTime? lastActivity,
    Set<String>? unlockedBadgeIds,
  }) =>
      GamificationState(
        points: points ?? this.points,
        streakDays: streakDays ?? this.streakDays,
        lastActivity: lastActivity ?? this.lastActivity,
        unlockedBadgeIds: unlockedBadgeIds ?? this.unlockedBadgeIds,
      );

  Map<String, dynamic> toJson() => {
        'points': points,
        'streakDays': streakDays,
        'lastActivity': lastActivity?.toIso8601String(),
        'unlockedBadgeIds': unlockedBadgeIds.toList(),
      };

  factory GamificationState.fromJson(Map<String, dynamic> json) =>
      GamificationState(
        points: (json['points'] as int?) ?? 0,
        streakDays: (json['streakDays'] as int?) ?? 0,
        lastActivity: json['lastActivity'] != null
            ? DateTime.tryParse(json['lastActivity'] as String)
            : null,
        unlockedBadgeIds:
            ((json['unlockedBadgeIds'] as List?)?.cast<String>() ?? const [])
                .toSet(),
      );
}
