import '../core/constants/app_constants.dart';

/// The authenticated user's fitness profile.
class UserProfile {
  final String id;
  final String name;        // Display name = "Prénom Nom" (or fallback)
  final String email;
  final int age;
  final double heightCm;
  final double weightKg;
  final FitnessLevel level;
  final Goal goal;
  final String? avatarUrl;
  final DateTime createdAt;

  // New, optional civil-status fields collected at sign-up.
  final String? firstName;
  final String? lastName;
  final String? phone;

  /// True when civil info (firstName / phone) has been collected. Used by the
  /// auth gate to route through the "additional info" screen after a Google /
  /// Apple sign-in.
  final bool detailsComplete;

  const UserProfile({
    required this.id,
    required this.name,
    required this.email,
    this.age = 25,
    this.heightCm = 175,
    this.weightKg = 70,
    this.level = FitnessLevel.beginner,
    this.goal = Goal.getFit,
    this.avatarUrl,
    required this.createdAt,
    this.firstName,
    this.lastName,
    this.phone,
    this.detailsComplete = false,
  });

  /// Body Mass Index.
  double get bmi {
    final h = heightCm / 100;
    if (h <= 0) return 0;
    return weightKg / (h * h);
  }

  String get bmiCategory {
    final v = bmi;
    if (v < 18.5) return 'Insuffisant';
    if (v < 25) return 'Normal';
    if (v < 30) return 'Surpoids';
    return 'Obésité';
  }

  /// Estimated basal metabolic rate (Mifflin-St Jeor, gender-neutral avg).
  double get estimatedDailyCalories {
    final bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
    final activity = switch (level) {
      FitnessLevel.beginner => 1.375,
      FitnessLevel.intermediate => 1.55,
      FitnessLevel.professional => 1.725,
    };
    var total = bmr * activity;
    if (goal == Goal.loseWeight) total -= 400;
    if (goal == Goal.buildMuscle || goal == Goal.gainStrength) total += 300;
    return total;
  }

  UserProfile copyWith({
    String? name,
    String? email,
    int? age,
    double? heightCm,
    double? weightKg,
    FitnessLevel? level,
    Goal? goal,
    String? avatarUrl,
    String? firstName,
    String? lastName,
    String? phone,
    bool? detailsComplete,
  }) {
    return UserProfile(
      id: id,
      name: name ?? this.name,
      email: email ?? this.email,
      age: age ?? this.age,
      heightCm: heightCm ?? this.heightCm,
      weightKg: weightKg ?? this.weightKg,
      level: level ?? this.level,
      goal: goal ?? this.goal,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      createdAt: createdAt,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      phone: phone ?? this.phone,
      detailsComplete: detailsComplete ?? this.detailsComplete,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'age': age,
        'heightCm': heightCm,
        'weightKg': weightKg,
        'level': level.index,
        'goal': goal.index,
        'avatarUrl': avatarUrl,
        'createdAt': createdAt.toIso8601String(),
        'firstName': firstName,
        'lastName': lastName,
        'phone': phone,
        'detailsComplete': detailsComplete,
      };

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
        id: json['id'] as String,
        name: json['name'] as String,
        email: json['email'] as String,
        age: (json['age'] as num?)?.toInt() ?? 25,
        heightCm: (json['heightCm'] as num?)?.toDouble() ?? 175,
        weightKg: (json['weightKg'] as num?)?.toDouble() ?? 70,
        level: FitnessLevel.values[(json['level'] as int?) ?? 0],
        goal: Goal.values[(json['goal'] as int?) ?? 2],
        firstName: json['firstName'] as String?,
        lastName: json['lastName'] as String?,
        phone: json['phone'] as String?,
        detailsComplete: (json['detailsComplete'] as bool?) ?? false,
        avatarUrl: json['avatarUrl'] as String?,
        createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
            DateTime.now(),
      );
}
