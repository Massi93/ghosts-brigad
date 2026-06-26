import '../core/constants/app_constants.dart';

enum MuscleGroup {
  fullBody,
  chest,
  back,
  legs,
  shoulders,
  arms,
  core,
  cardio,
}

extension MuscleGroupX on MuscleGroup {
  String get label => switch (this) {
        MuscleGroup.fullBody => 'Corps entier',
        MuscleGroup.chest => 'Pectoraux',
        MuscleGroup.back => 'Dos',
        MuscleGroup.legs => 'Jambes',
        MuscleGroup.shoulders => 'Épaules',
        MuscleGroup.arms => 'Bras',
        MuscleGroup.core => 'Abdos',
        MuscleGroup.cardio => 'Cardio',
      };
}

/// A single exercise with an instructional short video.
class Exercise {
  final String id;
  final String name;
  final String description;
  final MuscleGroup muscleGroup;
  final FitnessLevel level;

  /// Streaming/short video URL (mp4/HLS). Managed via ContentService so
  /// videos can be added without shipping a new build.
  final String videoUrl;
  final String thumbnailUrl;
  final int durationSeconds;
  final int defaultSets;
  final int defaultReps;
  final int estimatedCalories;
  final List<String> tips;
  final bool isPremium;

  const Exercise({
    required this.id,
    required this.name,
    required this.description,
    required this.muscleGroup,
    required this.level,
    required this.videoUrl,
    required this.thumbnailUrl,
    this.durationSeconds = 45,
    this.defaultSets = 3,
    this.defaultReps = 12,
    this.estimatedCalories = 30,
    this.tips = const [],
    this.isPremium = false,
  });

  factory Exercise.fromJson(Map<String, dynamic> json) => Exercise(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String,
        muscleGroup:
            MuscleGroup.values[(json['muscleGroup'] as int?) ?? 0],
        level: FitnessLevel.values[(json['level'] as int?) ?? 0],
        videoUrl: json['videoUrl'] as String,
        thumbnailUrl: json['thumbnailUrl'] as String,
        durationSeconds: (json['durationSeconds'] as int?) ?? 45,
        defaultSets: (json['defaultSets'] as int?) ?? 3,
        defaultReps: (json['defaultReps'] as int?) ?? 12,
        estimatedCalories: (json['estimatedCalories'] as int?) ?? 30,
        tips: (json['tips'] as List?)?.cast<String>() ?? const [],
        isPremium: (json['isPremium'] as bool?) ?? false,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'description': description,
        'muscleGroup': muscleGroup.index,
        'level': level.index,
        'videoUrl': videoUrl,
        'thumbnailUrl': thumbnailUrl,
        'durationSeconds': durationSeconds,
        'defaultSets': defaultSets,
        'defaultReps': defaultReps,
        'estimatedCalories': estimatedCalories,
        'tips': tips,
        'isPremium': isPremium,
      };
}
