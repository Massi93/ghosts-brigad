import '../core/constants/app_constants.dart';
import '../models/exercise.dart';

/// Sample exercise library. In production these rows live in PostgreSQL /
/// Firestore and are fetched via ContentService, so new videos can be added
/// without shipping an app update.
///
/// Video URLs point to Google's public sample streams as placeholders — swap
/// them for your own CDN/HLS streams (see docs/SETUP.md "Contenu vidéo").
const _sampleVideo =
    'https://flutter.github.io/assets-for-api-docs/assets/videos/butterfly.mp4';
const _sampleVideo2 =
    'https://flutter.github.io/assets-for-api-docs/assets/videos/bee.mp4';

String _thumb(String q) =>
    'https://source.unsplash.com/featured/400x300/?$q,fitness';

final List<Exercise> kExercises = [
  Exercise(
    id: 'ex_pushup',
    name: 'Pompes',
    description:
        'Exercice au poids du corps ciblant les pectoraux, triceps et épaules. '
        'Garde le corps gainé et descends jusqu\'à frôler le sol.',
    muscleGroup: MuscleGroup.chest,
    level: FitnessLevel.beginner,
    videoUrl: _sampleVideo,
    thumbnailUrl: _thumb('pushup'),
    durationSeconds: 40,
    defaultSets: 3,
    defaultReps: 12,
    estimatedCalories: 35,
    tips: const [
      'Garde le dos droit et les abdos contractés.',
      'Coudes à ~45° du corps.',
      'Variante facile : sur les genoux.',
    ],
  ),
  Exercise(
    id: 'ex_squat',
    name: 'Squat',
    description:
        'Mouvement roi pour les jambes et les fessiers. Descends comme pour '
        't\'asseoir, genoux dans l\'axe des pieds.',
    muscleGroup: MuscleGroup.legs,
    level: FitnessLevel.beginner,
    videoUrl: _sampleVideo2,
    thumbnailUrl: _thumb('squat'),
    durationSeconds: 45,
    defaultSets: 3,
    defaultReps: 15,
    estimatedCalories: 40,
    tips: const [
      'Poids sur les talons.',
      'Cuisses parallèles au sol.',
      'Garde la poitrine ouverte.',
    ],
  ),
  Exercise(
    id: 'ex_plank',
    name: 'Gainage (planche)',
    description:
        'Renforce la sangle abdominale et stabilise le tronc. Maintiens la '
        'position en gardant le corps aligné.',
    muscleGroup: MuscleGroup.core,
    level: FitnessLevel.beginner,
    videoUrl: _sampleVideo,
    thumbnailUrl: _thumb('plank'),
    durationSeconds: 30,
    defaultSets: 3,
    defaultReps: 1,
    estimatedCalories: 20,
    tips: const ['Ne creuse pas le bas du dos.', 'Respire calmement.'],
  ),
  Exercise(
    id: 'ex_jumpingjack',
    name: 'Jumping Jacks',
    description:
        'Cardio simple pour élever le rythme cardiaque et s\'échauffer.',
    muscleGroup: MuscleGroup.cardio,
    level: FitnessLevel.beginner,
    videoUrl: _sampleVideo2,
    thumbnailUrl: _thumb('jumping'),
    durationSeconds: 60,
    defaultSets: 3,
    defaultReps: 30,
    estimatedCalories: 45,
    tips: const ['Reste léger sur les appuis.'],
  ),
  Exercise(
    id: 'ex_lunge',
    name: 'Fentes',
    description:
        'Travaille les quadriceps et fessiers en unilatéral pour corriger les '
        'déséquilibres.',
    muscleGroup: MuscleGroup.legs,
    level: FitnessLevel.beginner,
    videoUrl: _sampleVideo,
    thumbnailUrl: _thumb('lunge'),
    durationSeconds: 50,
    defaultSets: 3,
    defaultReps: 12,
    estimatedCalories: 35,
    tips: const ['Genou avant au-dessus de la cheville.'],
  ),
  // ---- Premium-locked exercises (beyond the free 5) ----
  Exercise(
    id: 'ex_burpee',
    name: 'Burpees',
    description:
        'Exercice complet et intense : squat, planche, pompe et saut. '
        'Excellent pour le cardio et la dépense calorique.',
    muscleGroup: MuscleGroup.fullBody,
    level: FitnessLevel.intermediate,
    videoUrl: _sampleVideo2,
    thumbnailUrl: _thumb('burpee'),
    durationSeconds: 50,
    defaultSets: 4,
    defaultReps: 12,
    estimatedCalories: 60,
    isPremium: true,
    tips: const ['Garde un rythme contrôlé.', 'Atterris en douceur.'],
  ),
  Exercise(
    id: 'ex_pullup',
    name: 'Tractions',
    description:
        'Le meilleur exercice pour le dos et les biceps au poids du corps.',
    muscleGroup: MuscleGroup.back,
    level: FitnessLevel.intermediate,
    videoUrl: _sampleVideo,
    thumbnailUrl: _thumb('pullup'),
    durationSeconds: 45,
    defaultSets: 4,
    defaultReps: 8,
    estimatedCalories: 50,
    isPremium: true,
    tips: const ['Tire avec le dos, pas seulement les bras.'],
  ),
  Exercise(
    id: 'ex_deadlift',
    name: 'Soulevé de terre',
    description:
        'Mouvement de force totale ciblant chaîne postérieure. Technique '
        'cruciale — dos neutre.',
    muscleGroup: MuscleGroup.back,
    level: FitnessLevel.professional,
    videoUrl: _sampleVideo2,
    thumbnailUrl: _thumb('deadlift'),
    durationSeconds: 60,
    defaultSets: 5,
    defaultReps: 5,
    estimatedCalories: 70,
    isPremium: true,
    tips: const ['Barre proche des tibias.', 'Pousse dans le sol.'],
  ),
  Exercise(
    id: 'ex_shoulderpress',
    name: 'Développé épaules',
    description: 'Renforce les deltoïdes et le haut du corps.',
    muscleGroup: MuscleGroup.shoulders,
    level: FitnessLevel.intermediate,
    videoUrl: _sampleVideo,
    thumbnailUrl: _thumb('shoulder'),
    durationSeconds: 45,
    defaultSets: 4,
    defaultReps: 10,
    estimatedCalories: 40,
    isPremium: true,
  ),
  Exercise(
    id: 'ex_mountainclimber',
    name: 'Mountain Climbers',
    description: 'Cardio + gainage dynamique pour brûler des calories.',
    muscleGroup: MuscleGroup.core,
    level: FitnessLevel.intermediate,
    videoUrl: _sampleVideo2,
    thumbnailUrl: _thumb('core'),
    durationSeconds: 40,
    defaultSets: 3,
    defaultReps: 30,
    estimatedCalories: 45,
    isPremium: true,
  ),
];
