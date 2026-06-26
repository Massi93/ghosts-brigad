import 'package:flutter/foundation.dart';

import '../core/constants/app_constants.dart';
import '../data/mock_gamification.dart';
import '../models/gamification.dart';
import '../services/storage_service.dart';

/// Tracks points, level, streak, badges and challenges.
class GamificationProvider extends ChangeNotifier {
  GamificationProvider(this._storage) {
    _load();
  }

  final StorageService _storage;
  GamificationState _state = const GamificationState();
  final List<Challenge> _challenges = List.of(kChallenges);

  GamificationState get state => _state;
  List<Challenge> get challenges => _challenges;

  List<AchievementBadge> get badges => kBadges
      .map((b) =>
          b.copyWith(unlocked: _state.unlockedBadgeIds.contains(b.id)))
      .toList();

  int get unlockedBadgeCount => _state.unlockedBadgeIds.length;

  void _load() {
    final json = _storage.readJsonMap(AppConstants.kGamification);
    if (json != null) _state = GamificationState.fromJson(json);
  }

  Future<void> _persist() async {
    await _storage.writeJson(AppConstants.kGamification, _state.toJson());
    notifyListeners();
  }

  /// Award points and refresh the daily streak.
  Future<void> addPoints(int points) async {
    final newStreak = _computeStreak();
    _state = _state.copyWith(
      points: _state.points + points,
      streakDays: newStreak,
      lastActivity: DateTime.now(),
    );
    _maybeUnlockMilestones();
    await _persist();
  }

  int _computeStreak() {
    final last = _state.lastActivity;
    if (last == null) return 1;
    final now = DateTime.now();
    final lastDay = DateTime(last.year, last.month, last.day);
    final today = DateTime(now.year, now.month, now.day);
    final diff = today.difference(lastDay).inDays;
    if (diff == 0) return _state.streakDays == 0 ? 1 : _state.streakDays;
    if (diff == 1) return _state.streakDays + 1;
    return 1; // streak broken
  }

  /// Increment a challenge's progress and reward points on completion.
  Future<void> progressChallenge(String id, int by) async {
    final i = _challenges.indexWhere((c) => c.id == id);
    if (i == -1) return;
    final c = _challenges[i];
    final wasComplete = c.isComplete;
    _challenges[i] = c.copyWith(
      currentValue: (c.currentValue + by).clamp(0, c.targetValue).toInt(),
    );
    if (!wasComplete && _challenges[i].isComplete) {
      await addPoints(c.rewardPoints);
    } else {
      notifyListeners();
    }
  }

  Future<void> unlockBadge(String id) async {
    if (_state.unlockedBadgeIds.contains(id)) return;
    _state = _state.copyWith(
      unlockedBadgeIds: {..._state.unlockedBadgeIds, id},
    );
    await addPoints(AppConstants.pointsPerBadge);
  }

  void _maybeUnlockMilestones() {
    final ids = {..._state.unlockedBadgeIds};
    if (_state.streakDays >= 3) ids.add('badge_streak_3');
    if (_state.streakDays >= 7) ids.add('badge_streak_7');
    if (_state.level >= 5) ids.add('badge_level_5');
    if (ids.length != _state.unlockedBadgeIds.length) {
      _state = _state.copyWith(unlockedBadgeIds: ids);
    }
  }
}
