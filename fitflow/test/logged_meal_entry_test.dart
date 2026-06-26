import 'package:flutter_test/flutter_test.dart';
import 'package:fitflow/models/logged_meal_entry.dart';

void main() {
  group('LoggedMealEntry', () {
    test('isSameDay matches calendar day, ignoring time of day', () {
      final morning = LoggedMealEntry(
        mealId: 'm1',
        loggedAt: DateTime(2026, 6, 26, 8, 30),
      );
      expect(morning.isSameDay(DateTime(2026, 6, 26, 23, 0)), isTrue);
      expect(morning.isSameDay(DateTime(2026, 6, 27, 0, 1)), isFalse);
      expect(morning.isSameDay(DateTime(2026, 6, 25, 23, 59)), isFalse);
    });

    test('JSON round-trip preserves the timestamp', () {
      final e = LoggedMealEntry(
        mealId: 'meal_xyz',
        loggedAt: DateTime(2026, 6, 26, 12, 0),
      );
      final restored = LoggedMealEntry.fromJson(e.toJson());
      expect(restored.mealId, 'meal_xyz');
      expect(restored.loggedAt, DateTime(2026, 6, 26, 12, 0));
    });

    test('fromJson accepts the legacy bare-string format', () {
      // Old data on disk was just a list of meal-id strings.
      final restored = LoggedMealEntry.fromJson('old_meal_id');
      expect(restored.mealId, 'old_meal_id');
      expect(restored.loggedAt, isA<DateTime>());
    });
  });
}
