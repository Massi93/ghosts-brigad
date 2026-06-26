/// A single dated progress measurement used for charts & statistics.
class ProgressEntry {
  final String id;
  final DateTime date;
  final double weightKg;
  final double? bodyFatPct;
  final int workoutsCompleted;
  final int caloriesBurned;

  const ProgressEntry({
    required this.id,
    required this.date,
    required this.weightKg,
    this.bodyFatPct,
    this.workoutsCompleted = 0,
    this.caloriesBurned = 0,
  });

  factory ProgressEntry.fromJson(Map<String, dynamic> json) => ProgressEntry(
        id: json['id'] as String,
        date: DateTime.parse(json['date'] as String),
        weightKg: (json['weightKg'] as num).toDouble(),
        bodyFatPct: (json['bodyFatPct'] as num?)?.toDouble(),
        workoutsCompleted: (json['workoutsCompleted'] as int?) ?? 0,
        caloriesBurned: (json['caloriesBurned'] as int?) ?? 0,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'date': date.toIso8601String(),
        'weightKg': weightKg,
        'bodyFatPct': bodyFatPct,
        'workoutsCompleted': workoutsCompleted,
        'caloriesBurned': caloriesBurned,
      };
}
