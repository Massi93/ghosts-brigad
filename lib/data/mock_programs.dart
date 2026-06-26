import '../core/constants/app_constants.dart';
import '../models/exercise.dart';
import '../models/workout_program.dart';
import 'mock_exercises.dart';

Exercise _byId(String id) => kExercises.firstWhere((e) => e.id == id);

String _cover(String q) =>
    'https://source.unsplash.com/featured/800x500/?$q,workout,gym';

final List<WorkoutProgram> kPrograms = [
  // ====== FREE PROGRAMS ======
  WorkoutProgram(
    id: 'prog_beginner_fullbody',
    title: 'Full Body Débutant',
    description:
        'Un programme complet pour démarrer en douceur et construire des bases '
        'solides. Aucun équipement requis.',
    level: FitnessLevel.beginner,
    focus: MuscleGroup.fullBody,
    durationMinutes: 25,
    estimatedCalories: 180,
    coverUrl: _cover('home'),
    exercises: [
      _byId('ex_jumpingjack'),
      _byId('ex_squat'),
      _byId('ex_pushup'),
      _byId('ex_lunge'),
      _byId('ex_plank'),
    ],
  ),
  WorkoutProgram(
    id: 'prog_core_express',
    title: 'Abdos Express',
    description:
        'Renforce ta sangle abdominale en 15 minutes chrono. Parfait en fin '
        'de séance.',
    level: FitnessLevel.beginner,
    focus: MuscleGroup.core,
    durationMinutes: 15,
    estimatedCalories: 120,
    coverUrl: _cover('abs'),
    exercises: [
      _byId('ex_plank'),
      _byId('ex_crunch'),
      _byId('ex_backextension'),
    ],
  ),
  WorkoutProgram(
    id: 'prog_warmup',
    title: 'Échauffement Complet',
    description:
        '10 minutes d\'échauffement dynamique pour préparer le corps à '
        'l\'effort, mobilité et activation.',
    level: FitnessLevel.beginner,
    focus: MuscleGroup.fullBody,
    durationMinutes: 10,
    estimatedCalories: 80,
    coverUrl: _cover('warmup'),
    exercises: [
      _byId('ex_jumpingjack'),
      _byId('ex_highknees'),
      _byId('ex_glutebridge'),
    ],
  ),
  WorkoutProgram(
    id: 'prog_arms_basic',
    title: 'Bras Tonifiés',
    description:
        'Programme bras pour débutants : biceps, triceps, épaules. Avec haltères '
        'ou bouteilles d\'eau.',
    level: FitnessLevel.beginner,
    focus: MuscleGroup.arms,
    durationMinutes: 20,
    estimatedCalories: 150,
    coverUrl: _cover('arms'),
    exercises: [
      _byId('ex_pushup'),
      _byId('ex_bicepcurl'),
      _byId('ex_tricepkickback'),
    ],
  ),

  // ====== PREMIUM PROGRAMS ======
  WorkoutProgram(
    id: 'prog_hiit_fatburn',
    title: 'HIIT Brûle-Graisses',
    description:
        'Séance haute intensité pour maximiser la dépense calorique en peu de '
        'temps. Intervalles courts et intenses.',
    level: FitnessLevel.intermediate,
    focus: MuscleGroup.cardio,
    durationMinutes: 30,
    estimatedCalories: 320,
    coverUrl: _cover('hiit'),
    isPremium: true,
    exercises: [
      _byId('ex_burpee'),
      _byId('ex_mountainclimber'),
      _byId('ex_jumpingjack'),
      _byId('ex_squat'),
      _byId('ex_highknees'),
    ],
  ),
  WorkoutProgram(
    id: 'prog_upper_strength',
    title: 'Force Haut du Corps',
    description:
        'Développe la force et la masse du haut du corps avec des mouvements '
        'composés exigeants.',
    level: FitnessLevel.professional,
    focus: MuscleGroup.chest,
    durationMinutes: 45,
    estimatedCalories: 380,
    coverUrl: _cover('strength'),
    isPremium: true,
    exercises: [
      _byId('ex_pullup'),
      _byId('ex_shoulderpress'),
      _byId('ex_pushup'),
      _byId('ex_dips'),
      _byId('ex_deadlift'),
    ],
  ),
  WorkoutProgram(
    id: 'prog_legs_power',
    title: 'Jambes Puissance',
    description:
        'Programme dédié au bas du corps pour des jambes fortes et galbées.',
    level: FitnessLevel.intermediate,
    focus: MuscleGroup.legs,
    durationMinutes: 35,
    estimatedCalories: 300,
    coverUrl: _cover('legs'),
    isPremium: true,
    exercises: [
      _byId('ex_squat'),
      _byId('ex_lunge'),
      _byId('ex_wallsit'),
      _byId('ex_glutebridge'),
      _byId('ex_deadlift'),
    ],
  ),
  WorkoutProgram(
    id: 'prog_core_advanced',
    title: 'Abdos en Béton',
    description:
        'Programme avancé pour des abdos sculptés : grand droit, obliques, '
        'transverse. 6 minutes intenses.',
    level: FitnessLevel.intermediate,
    focus: MuscleGroup.core,
    durationMinutes: 20,
    estimatedCalories: 180,
    coverUrl: _cover('six-pack'),
    isPremium: true,
    exercises: [
      _byId('ex_plank'),
      _byId('ex_russiantwist'),
      _byId('ex_bicyclecrunch'),
      _byId('ex_mountainclimber'),
    ],
  ),
  WorkoutProgram(
    id: 'prog_cardio_burst',
    title: 'Cardio Express',
    description:
        'Séance cardio courte mais explosive. Idéale en pause déjeuner ou '
        'avant le travail.',
    level: FitnessLevel.intermediate,
    focus: MuscleGroup.cardio,
    durationMinutes: 20,
    estimatedCalories: 250,
    coverUrl: _cover('cardio'),
    isPremium: true,
    exercises: [
      _byId('ex_jumprope'),
      _byId('ex_jumpingjack'),
      _byId('ex_highknees'),
      _byId('ex_burpee'),
    ],
  ),
];
