import '../core/constants/app_constants.dart';
import 'exercise.dart';

/// A structured workout program made of ordered exercises.
class WorkoutProgram {
  final String id;
  final String title;
  final String description;
  final FitnessLevel level;
  final MuscleGroup focus;
  final int durationMinutes;
  final int estimatedCalories;
  final String coverUrl;
  final List<Exercise> exercises;
  final bool isPremium;

  const WorkoutProgram({
    required this.id,
    required this.title,
    required this.description,
    required this.level,
    required this.focus,
    required this.durationMinutes,
    required this.estimatedCalories,
    required this.coverUrl,
    required this.exercises,
    this.isPremium = false,
  });

  int get exerciseCount => exercises.length;

  factory WorkoutProgram.fromJson(Map<String, dynamic> json) =>
      WorkoutProgram(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String,
        level: FitnessLevel.values[(json['level'] as int?) ?? 0],
        focus: MuscleGroup.values[(json['focus'] as int?) ?? 0],
        durationMinutes: (json['durationMinutes'] as int?) ?? 30,
        estimatedCalories: (json['estimatedCalories'] as int?) ?? 200,
        coverUrl: json['coverUrl'] as String,
        exercises: (json['exercises'] as List)
            .map((e) => Exercise.fromJson(e as Map<String, dynamic>))
            .toList(),
        isPremium: (json['isPremium'] as bool?) ?? false,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'level': level.index,
        'focus': focus.index,
        'durationMinutes': durationMinutes,
        'estimatedCalories': estimatedCalories,
        'coverUrl': coverUrl,
        'exercises': exercises.map((e) => e.toJson()).toList(),
        'isPremium': isPremium,
      };
}
