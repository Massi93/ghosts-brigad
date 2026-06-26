import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fitflow/models/user_profile.dart';
import 'package:fitflow/core/constants/app_constants.dart';
import 'package:fitflow/models/gamification.dart';

void main() {
  group('UserProfile', () {
    final profile = UserProfile(
      id: '1',
      name: 'Test',
      email: 't@t.com',
      age: 30,
      heightCm: 180,
      weightKg: 81,
      level: FitnessLevel.intermediate,
      goal: Goal.buildMuscle,
      createdAt: DateTime(2024),
    );

    test('BMI is computed correctly', () {
      // 81 / (1.8^2) = 25.0
      expect(profile.bmi, closeTo(25.0, 0.1));
      expect(profile.bmiCategory, 'Surpoids');
    });

    test('daily calories increase for muscle-building goal', () {
      expect(profile.estimatedDailyCalories, greaterThan(2000));
    });

    test('serialises round-trip', () {
      final json = profile.toJson();
      final restored = UserProfile.fromJson(json);
      expect(restored.name, profile.name);
      expect(restored.level, profile.level);
      expect(restored.goal, profile.goal);
    });
  });

  group('GamificationState', () {
    test('level scales every 500 points', () {
      const s = GamificationState(points: 1100);
      expect(s.level, 3);
      expect(s.pointsIntoLevel, 100);
    });
  });

  group('Challenge progress', () {
    test('clamps between 0 and 1', () {
      const c = Challenge(
        id: 'c',
        title: 't',
        description: 'd',
        targetValue: 3,
        rewardPoints: 10,
        icon: Icons.flag,
        currentValue: 5,
      );
      expect(c.progress, 1.0);
      expect(c.isComplete, isTrue);
    });
  });
}
