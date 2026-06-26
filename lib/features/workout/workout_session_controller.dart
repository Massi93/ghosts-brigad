import 'package:flutter/foundation.dart';

import '../../models/exercise.dart';
import '../../models/workout_program.dart';

enum SessionStepType { work, rest }

/// A single step of a guided workout session: either an exercise to perform or
/// a rest period.
class SessionStep {
  final SessionStepType type;
  final Exercise? exercise;
  final int durationSeconds;

  const SessionStep({
    required this.type,
    this.exercise,
    required this.durationSeconds,
  });

  bool get isRest => type == SessionStepType.rest;
  String get title => isRest ? 'Repos' : exercise!.name;
}

/// Pure, UI-agnostic controller that drives a guided workout session.
///
/// The screen owns a 1-second periodic timer and calls [tick]; all the
/// sequencing logic lives here so it can be unit-tested without a widget.
class WorkoutSessionController extends ChangeNotifier {
  WorkoutSessionController(WorkoutProgram program, {this.restSeconds = 20})
      : steps = buildSteps(program, restSeconds) {
    _remaining = steps.isEmpty ? 0 : steps.first.durationSeconds;
    _finished = steps.isEmpty;
  }

  final int restSeconds;
  final List<SessionStep> steps;

  int _index = 0;
  int _remaining = 0;
  bool _running = true;
  bool _finished = false;

  int get index => _index;
  int get remaining => _remaining;
  bool get isRunning => _running;
  bool get isFinished => _finished;

  SessionStep? get current =>
      (_finished || steps.isEmpty) ? null : steps[_index];
  SessionStep? get next =>
      (_index + 1 < steps.length) ? steps[_index + 1] : null;

  int get totalSteps => steps.length;

  /// 0..1 progress through the current step.
  double get stepProgress {
    final c = current;
    if (c == null || c.durationSeconds == 0) return 0;
    final p = 1 - _remaining / c.durationSeconds;
    if (p < 0) return 0;
    if (p > 1) return 1;
    return p;
  }

  /// 0..1 progress through the whole session.
  double get overallProgress {
    if (steps.isEmpty) return 1;
    if (_finished) return 1;
    return _index / steps.length;
  }

  /// Build the ordered step list: a work step per exercise, separated by rests.
  static List<SessionStep> buildSteps(WorkoutProgram program, int rest) {
    final out = <SessionStep>[];
    final ex = program.exercises;
    for (var i = 0; i < ex.length; i++) {
      out.add(SessionStep(
        type: SessionStepType.work,
        exercise: ex[i],
        durationSeconds: ex[i].durationSeconds,
      ));
      if (i < ex.length - 1) {
        out.add(SessionStep(type: SessionStepType.rest, durationSeconds: rest));
      }
    }
    return out;
  }

  void togglePlay() {
    if (_finished) return;
    _running = !_running;
    notifyListeners();
  }

  /// Advance the countdown by one second. No-op when paused or finished.
  void tick() {
    if (!_running || _finished) return;
    if (_remaining > 1) {
      _remaining--;
      notifyListeners();
    } else {
      _advance();
    }
  }

  /// Skip to the next step immediately.
  void skip() => _advance();

  /// Go back to the previous step.
  void previous() {
    if (_index == 0) return;
    _index--;
    _remaining = steps[_index].durationSeconds;
    _finished = false;
    notifyListeners();
  }

  void _advance() {
    if (_index + 1 < steps.length) {
      _index++;
      _remaining = steps[_index].durationSeconds;
    } else {
      _finished = true;
      _running = false;
    }
    notifyListeners();
  }
}
