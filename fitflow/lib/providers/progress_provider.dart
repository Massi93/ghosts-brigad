import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import '../core/constants/app_constants.dart';
import '../models/progress_entry.dart';
import '../services/storage_service.dart';

/// Stores and aggregates the user's progress measurements.
class ProgressProvider extends ChangeNotifier {
  ProgressProvider(this._storage) {
    _load();
  }

  final StorageService _storage;
  final _uuid = const Uuid();
  List<ProgressEntry> _entries = [];

  List<ProgressEntry> get entries {
    final sorted = [..._entries]..sort((a, b) => a.date.compareTo(b.date));
    return sorted;
  }

  bool get isEmpty => _entries.isEmpty;

  double? get latestWeight => entries.isEmpty ? null : entries.last.weightKg;

  double? get weightDelta {
    if (entries.length < 2) return null;
    return entries.last.weightKg - entries.first.weightKg;
  }

  int get totalCaloriesBurned =>
      _entries.fold(0, (s, e) => s + e.caloriesBurned);

  int get totalWorkouts =>
      _entries.fold(0, (s, e) => s + e.workoutsCompleted);

  void _load() {
    final list = _storage.readJsonList(AppConstants.kProgressEntries);
    if (list != null) {
      _entries = list
          .map((e) => ProgressEntry.fromJson(e as Map<String, dynamic>))
          .toList();
    } else {
      _seedDemoData();
    }
  }

  /// Seed a few weeks of demo data so charts aren't empty on first launch.
  void _seedDemoData() {
    final now = DateTime.now();
    double w = 78;
    for (int i = 6; i >= 0; i--) {
      w -= 0.6;
      _entries.add(ProgressEntry(
        id: _uuid.v4(),
        date: now.subtract(Duration(days: i * 5)),
        weightKg: double.parse(w.toStringAsFixed(1)),
        bodyFatPct: 22 - (6 - i) * 0.4,
        workoutsCompleted: 2 + (i % 3),
        caloriesBurned: 400 + i * 60,
      ));
    }
  }

  Future<void> addEntry({
    required double weightKg,
    double? bodyFatPct,
    int workoutsCompleted = 0,
    int caloriesBurned = 0,
  }) async {
    _entries.add(ProgressEntry(
      id: _uuid.v4(),
      date: DateTime.now(),
      weightKg: weightKg,
      bodyFatPct: bodyFatPct,
      workoutsCompleted: workoutsCompleted,
      caloriesBurned: caloriesBurned,
    ));
    await _persist();
  }

  Future<void> _persist() async {
    await _storage.writeJson(
      AppConstants.kProgressEntries,
      _entries.map((e) => e.toJson()).toList(),
    );
    notifyListeners();
  }
}
