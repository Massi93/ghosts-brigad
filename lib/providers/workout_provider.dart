import 'package:flutter/foundation.dart';

import '../core/constants/app_constants.dart';
import '../models/exercise.dart';
import '../models/workout_program.dart';
import '../services/content_service.dart';
import '../services/storage_service.dart';

/// Loads programs/exercises and tracks completed workouts.
class WorkoutProvider extends ChangeNotifier {
  WorkoutProvider(this._content, this._storage) {
    load();
    _completed = (_storage.readJsonList(AppConstants.kCompletedWorkouts) ?? [])
        .cast<String>()
        .toList();
  }

  final ContentService _content;
  final StorageService _storage;

  List<WorkoutProgram> _programs = [];
  List<Exercise> _exercises = [];
  List<String> _completed = [];
  bool _loading = true;

  List<WorkoutProgram> get programs => _programs;
  List<Exercise> get exercises => _exercises;
  bool get isLoading => _loading;
  int get completedCount => _completed.length;

  bool isCompleted(String programId) => _completed.contains(programId);

  Future<void> load() async {
    _loading = true;
    notifyListeners();
    _programs = await _content.getPrograms();
    _exercises = await _content.getExercises();
    _loading = false;
    notifyListeners();
  }

  /// Programs filtered for what a free user can access (non-premium only)
  /// when [premium] is false.
  List<WorkoutProgram> accessiblePrograms({required bool premium}) {
    if (premium) return _programs;
    return _programs.where((p) => !p.isPremium).toList();
  }

  /// Free users only get the first [freeExerciseLimit] exercises.
  List<Exercise> accessibleExercises({required bool premium}) {
    if (premium) return _exercises;
    return _exercises
        .where((e) => !e.isPremium)
        .take(AppConstants.freeExerciseLimit)
        .toList();
  }

  Future<void> markCompleted(String programId) async {
    _completed.add(programId);
    await _storage.writeJson(AppConstants.kCompletedWorkouts, _completed);
    notifyListeners();
  }
}
