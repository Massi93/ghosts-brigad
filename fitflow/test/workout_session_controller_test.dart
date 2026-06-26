import 'package:flutter_test/flutter_test.dart';
import 'package:fitflow/core/constants/app_constants.dart';
import 'package:fitflow/models/exercise.dart';
import 'package:fitflow/models/workout_program.dart';
import 'package:fitflow/features/workout/workout_session_controller.dart';

Exercise _ex(String id, int seconds) => Exercise(
      id: id,
      name: 'Ex $id',
      description: '',
      muscleGroup: MuscleGroup.fullBody,
      level: FitnessLevel.beginner,
      videoUrl: '',
      thumbnailUrl: '',
      durationSeconds: seconds,
    );

WorkoutProgram _program(List<Exercise> exercises) => WorkoutProgram(
      id: 'p',
      title: 'Test',
      description: '',
      level: FitnessLevel.beginner,
      focus: MuscleGroup.fullBody,
      durationMinutes: 10,
      estimatedCalories: 100,
      coverUrl: '',
      exercises: exercises,
    );

void main() {
  group('WorkoutSessionController.buildSteps', () {
    test('interleaves rests between exercises (2N-1 steps)', () {
      final c = WorkoutSessionController(
        _program([_ex('a', 30), _ex('b', 30), _ex('c', 30)]),
        restSeconds: 15,
      );
      expect(c.totalSteps, 5); // work, rest, work, rest, work
      expect(c.steps[0].type, SessionStepType.work);
      expect(c.steps[1].type, SessionStepType.rest);
      expect(c.steps[1].durationSeconds, 15);
      expect(c.steps.last.type, SessionStepType.work);
    });

    test('single exercise has no rest step', () {
      final c = WorkoutSessionController(_program([_ex('a', 30)]));
      expect(c.totalSteps, 1);
      expect(c.current?.isRest, isFalse);
      expect(c.next, isNull);
    });
  });

  group('countdown & sequencing', () {
    test('tick decrements then advances to next step', () {
      final c = WorkoutSessionController(
        _program([_ex('a', 3), _ex('b', 3)]),
        restSeconds: 2,
      );
      expect(c.remaining, 3);
      c.tick(); // 3 -> 2
      c.tick(); // 2 -> 1
      expect(c.remaining, 1);
      c.tick(); // 1 -> advance to rest step
      expect(c.current?.isRest, isTrue);
      expect(c.remaining, 2);
    });

    test('stepProgress goes from 0 toward 1', () {
      final c = WorkoutSessionController(_program([_ex('a', 4)]));
      expect(c.stepProgress, 0);
      c.tick(); // remaining 3
      expect(c.stepProgress, closeTo(0.25, 0.001));
    });

    test('running through every step finishes the session', () {
      final c = WorkoutSessionController(
        _program([_ex('a', 2), _ex('b', 2)]),
        restSeconds: 1,
      );
      // Drive enough ticks to exhaust all steps.
      for (var i = 0; i < 20 && !c.isFinished; i++) {
        c.tick();
      }
      expect(c.isFinished, isTrue);
      expect(c.overallProgress, 1);
      expect(c.current, isNull);
    });

    test('pause stops the countdown', () {
      final c = WorkoutSessionController(_program([_ex('a', 5)]));
      c.togglePlay(); // pause
      final before = c.remaining;
      c.tick();
      expect(c.remaining, before);
    });

    test('skip and previous move between steps', () {
      final c = WorkoutSessionController(
        _program([_ex('a', 30), _ex('b', 30)]),
        restSeconds: 10,
      );
      c.skip(); // -> rest
      expect(c.current?.isRest, isTrue);
      c.previous(); // back to first work
      expect(c.index, 0);
      expect(c.remaining, 30);
    });
  });
}
