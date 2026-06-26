import '../core/constants/app_constants.dart';
import '../models/exercise.dart';

/// Sample exercise library. In production these rows live in PostgreSQL /
/// Firestore and are fetched via ContentService, so new videos can be added
/// without shipping an app update.
///
/// Video URLs are left empty — the player shows an elegant "Vidéo bientôt
/// disponible" hero with the thumbnail as backdrop. Plug your own CDN URLs
/// here when ready (see docs/SETUP.md "Contenu vidéo").

String _thumb(String q) =>
    'https://source.unsplash.com/featured/400x300/?$q,fitness';

final List<Exercise> kExercises = [
  // ============== FREE TIER (no Premium required) ==============
  Exercise(
    id: 'ex_pushup',
    name: 'Pompes',
    description:
        'Exercice au poids du corps ciblant les pectoraux, triceps et épaules. '
        'Garde le corps gainé et descends jusqu\'à frôler le sol.',
    muscleGroup: MuscleGroup.chest,
    level: FitnessLevel.beginner,
    videoUrl: '',
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
    videoUrl: '',
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
    videoUrl: '',
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
    videoUrl: '',
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
    videoUrl: '',
    thumbnailUrl: _thumb('lunge'),
    durationSeconds: 50,
    defaultSets: 3,
    defaultReps: 12,
    estimatedCalories: 35,
    tips: const ['Genou avant au-dessus de la cheville.'],
  ),

  // ============== PREMIUM EXERCISES ==============
  Exercise(
    id: 'ex_burpee',
    name: 'Burpees',
    description:
        'Exercice complet et intense : squat, planche, pompe et saut. '
        'Excellent pour le cardio et la dépense calorique.',
    muscleGroup: MuscleGroup.fullBody,
    level: FitnessLevel.intermediate,
    videoUrl: '',
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
    videoUrl: '',
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
    videoUrl: '',
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
    videoUrl: '',
    thumbnailUrl: _thumb('shoulder'),
    durationSeconds: 45,
    defaultSets: 4,
    defaultReps: 10,
    estimatedCalories: 40,
    isPremium: true,
    tips: const ['Garde les abdos gainés.', 'Pousse vers le haut, pas vers l\'avant.'],
  ),
  Exercise(
    id: 'ex_mountainclimber',
    name: 'Mountain Climbers',
    description: 'Cardio + gainage dynamique pour brûler des calories.',
    muscleGroup: MuscleGroup.core,
    level: FitnessLevel.intermediate,
    videoUrl: '',
    thumbnailUrl: _thumb('core'),
    durationSeconds: 40,
    defaultSets: 3,
    defaultReps: 30,
    estimatedCalories: 45,
    isPremium: true,
    tips: const ['Genoux qui montent vers la poitrine, pas vers les coudes.'],
  ),
  // ---- NEW exercises ----
  Exercise(
    id: 'ex_dips',
    name: 'Dips',
    description:
        'Ciblent les triceps et le bas des pectoraux. Se font sur barres '
        'parallèles ou sur une chaise stable.',
    muscleGroup: MuscleGroup.arms,
    level: FitnessLevel.intermediate,
    videoUrl: '',
    thumbnailUrl: _thumb('dips'),
    durationSeconds: 45,
    defaultSets: 3,
    defaultReps: 10,
    estimatedCalories: 35,
    isPremium: true,
    tips: const ['Coudes serrés.', 'Descends jusqu\'à 90° au coude.'],
  ),
  Exercise(
    id: 'ex_crunch',
    name: 'Crunches',
    description:
        'Travail ciblé du grand droit (abdos). Mouvement court et contrôlé.',
    muscleGroup: MuscleGroup.core,
    level: FitnessLevel.beginner,
    videoUrl: '',
    thumbnailUrl: _thumb('abs'),
    durationSeconds: 40,
    defaultSets: 3,
    defaultReps: 20,
    estimatedCalories: 20,
    tips: const ['Ne tire pas sur ta nuque.', 'Souffle en remontant.'],
  ),
  Exercise(
    id: 'ex_glutebridge',
    name: 'Pont fessier',
    description:
        'Active fessiers et ischio-jambiers. Idéal en échauffement ou en '
        'finisseur.',
    muscleGroup: MuscleGroup.legs,
    level: FitnessLevel.beginner,
    videoUrl: '',
    thumbnailUrl: _thumb('glutes'),
    durationSeconds: 35,
    defaultSets: 3,
    defaultReps: 15,
    estimatedCalories: 25,
    tips: const ['Contracte les fessiers en haut.', 'Garde les abdos gainés.'],
  ),
  Exercise(
    id: 'ex_highknees',
    name: 'Montées de genoux',
    description:
        'Cardio intense, idéal en HIIT ou en échauffement dynamique.',
    muscleGroup: MuscleGroup.cardio,
    level: FitnessLevel.beginner,
    videoUrl: '',
    thumbnailUrl: _thumb('running'),
    durationSeconds: 45,
    defaultSets: 3,
    defaultReps: 40,
    estimatedCalories: 50,
    tips: const ['Genoux à hauteur des hanches.'],
  ),
  Exercise(
    id: 'ex_russiantwist',
    name: 'Russian Twists',
    description:
        'Travail des obliques. Assis, jambes décollées, fais pivoter le buste '
        'de gauche à droite.',
    muscleGroup: MuscleGroup.core,
    level: FitnessLevel.intermediate,
    videoUrl: '',
    thumbnailUrl: _thumb('obliques'),
    durationSeconds: 40,
    defaultSets: 3,
    defaultReps: 20,
    estimatedCalories: 30,
    isPremium: true,
    tips: const ['Garde le dos droit.', 'Le mouvement vient des hanches.'],
  ),
  Exercise(
    id: 'ex_bicepcurl',
    name: 'Curl biceps',
    description:
        'Isolation des biceps avec haltères ou bouteilles d\'eau. Lent à la '
        'descente pour maximiser le travail.',
    muscleGroup: MuscleGroup.arms,
    level: FitnessLevel.beginner,
    videoUrl: '',
    thumbnailUrl: _thumb('biceps'),
    durationSeconds: 40,
    defaultSets: 3,
    defaultReps: 12,
    estimatedCalories: 25,
    tips: const ['Coudes collés au corps.', 'Ne balance pas le buste.'],
  ),
  Exercise(
    id: 'ex_tricepkickback',
    name: 'Extension triceps',
    description:
        'Buste penché, extension complète du bras vers l\'arrière. Cible le '
        'triceps en profondeur.',
    muscleGroup: MuscleGroup.arms,
    level: FitnessLevel.beginner,
    videoUrl: '',
    thumbnailUrl: _thumb('triceps'),
    durationSeconds: 35,
    defaultSets: 3,
    defaultReps: 12,
    estimatedCalories: 25,
    tips: const ['Coude immobile, seul l\'avant-bras bouge.'],
  ),
  Exercise(
    id: 'ex_jumprope',
    name: 'Corde à sauter',
    description:
        'Cardio efficace pour le bas du corps et la coordination. Excellent '
        'pour brûler des calories rapidement.',
    muscleGroup: MuscleGroup.cardio,
    level: FitnessLevel.intermediate,
    videoUrl: '',
    thumbnailUrl: _thumb('jump-rope'),
    durationSeconds: 60,
    defaultSets: 4,
    defaultReps: 60,
    estimatedCalories: 70,
    isPremium: true,
    tips: const ['Saute juste assez haut pour passer la corde.'],
  ),
  Exercise(
    id: 'ex_wallsit',
    name: 'Chaise au mur',
    description:
        'Isométrique pour les cuisses. Dos contre le mur, genoux à 90°, '
        'maintiens la position.',
    muscleGroup: MuscleGroup.legs,
    level: FitnessLevel.beginner,
    videoUrl: '',
    thumbnailUrl: _thumb('wall-sit'),
    durationSeconds: 45,
    defaultSets: 3,
    defaultReps: 1,
    estimatedCalories: 25,
    tips: const ['Cuisses parallèles au sol.', 'Respire normalement.'],
  ),
  Exercise(
    id: 'ex_bicyclecrunch',
    name: 'Crunch vélo',
    description:
        'Variante dynamique du crunch qui sollicite les obliques en plus du '
        'grand droit.',
    muscleGroup: MuscleGroup.core,
    level: FitnessLevel.intermediate,
    videoUrl: '',
    thumbnailUrl: _thumb('core-workout'),
    durationSeconds: 45,
    defaultSets: 3,
    defaultReps: 20,
    estimatedCalories: 30,
    isPremium: true,
    tips: const ['Coude vers le genou opposé.'],
  ),
  Exercise(
    id: 'ex_backextension',
    name: 'Extension lombaire',
    description:
        'Renforce les lombaires et améliore la posture. Allongé sur le ventre, '
        'soulève le buste.',
    muscleGroup: MuscleGroup.back,
    level: FitnessLevel.beginner,
    videoUrl: '',
    thumbnailUrl: _thumb('back'),
    durationSeconds: 35,
    defaultSets: 3,
    defaultReps: 12,
    estimatedCalories: 20,
    tips: const ['Mouvement contrôlé.', 'Ne force pas en hyperextension.'],
  ),
];
