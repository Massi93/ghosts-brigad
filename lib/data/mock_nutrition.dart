import '../core/constants/app_constants.dart';
import '../models/nutrition_plan.dart';

/// Curated set of stable Unsplash food photo URLs (specific photo IDs that
/// don't depend on the deprecated source.unsplash.com random API). Each meal
/// is mapped to a thematically-relevant photo. The errorWidget in
/// CachedNetworkImage gracefully falls back to a fork/knife icon if a
/// specific URL ever 404s.
String _img(String id) =>
    'https://images.unsplash.com/photo-$id?w=600&q=80&auto=format&fit=crop';

// Oatmeal, eggs, salmon… curated photo IDs from public Unsplash collections.
const _oatmeal = '1517673400267-0251440c45dc';
const _chicken = '1604909052743-94e838986d24';
const _yogurt = '1488477181946-6428a0291777';
const _salmon = '1467003909585-2f8a72700288';
const _omelette = '1525351484163-7529414344d8';
const _salad = '1512621776951-a57141f2eefd';
const _shake = '1622597479711-26c9a3a8ec45';
const _turkey = '1574484284002-952d92456975';
const _avocado = '1525351484163-7529414344d8';
const _pasta = '1551892374-ecf8754cf8b0';
const _peanut = '1568822617270-2c1579f8dfe2';
const _potato = '1604908176997-125f25cc6f3d';

final List<NutritionPlan> kNutritionPlans = [
  NutritionPlan(
    id: 'plan_balance',
    title: 'Équilibre & Forme',
    description:
        'Un plan équilibré pour rester en forme, riche en protéines maigres, '
        'fibres et bons lipides.',
    goal: Goal.getFit,
    targetCalories: 2000,
    meals: [
      Meal(
        id: 'm1',
        name: 'Flocons d\'avoine, banane & amandes',
        type: MealType.breakfast,
        calories: 420,
        proteinG: 18,
        carbsG: 62,
        fatG: 12,
        ingredients: const ['60g flocons d\'avoine', '1 banane', '15g amandes', '200ml lait'],
        imageUrl: _img(_oatmeal),
      ),
      Meal(
        id: 'm2',
        name: 'Poulet grillé, riz complet & brocoli',
        type: MealType.lunch,
        calories: 620,
        proteinG: 45,
        carbsG: 65,
        fatG: 14,
        ingredients: const ['150g poulet', '80g riz complet', '200g brocoli'],
        imageUrl: _img(_chicken),
      ),
      Meal(
        id: 'm3',
        name: 'Yaourt grec & fruits rouges',
        type: MealType.snack,
        calories: 220,
        proteinG: 18,
        carbsG: 22,
        fatG: 6,
        ingredients: const ['200g yaourt grec', '100g fruits rouges'],
        imageUrl: _img(_yogurt),
      ),
      Meal(
        id: 'm4',
        name: 'Saumon, patate douce & épinards',
        type: MealType.dinner,
        calories: 560,
        proteinG: 38,
        carbsG: 45,
        fatG: 22,
        ingredients: const ['150g saumon', '200g patate douce', '150g épinards'],
        imageUrl: _img(_salmon),
      ),
    ],
  ),
  NutritionPlan(
    id: 'plan_cut',
    title: 'Sèche & Définition',
    description:
        'Déficit calorique maîtrisé, protéines élevées pour préserver le '
        'muscle tout en perdant du gras.',
    goal: Goal.loseWeight,
    targetCalories: 1600,
    isPremium: true,
    meals: [
      Meal(
        id: 'c1',
        name: 'Omelette blancs d\'œufs & légumes',
        type: MealType.breakfast,
        calories: 280,
        proteinG: 32,
        carbsG: 8,
        fatG: 12,
        ingredients: const ['4 blancs + 1 œuf', 'épinards', 'tomates'],
        imageUrl: _img(_omelette),
      ),
      Meal(
        id: 'c2',
        name: 'Salade de thon & quinoa',
        type: MealType.lunch,
        calories: 480,
        proteinG: 38,
        carbsG: 40,
        fatG: 14,
        ingredients: const ['120g thon', '60g quinoa', 'crudités'],
        imageUrl: _img(_salad),
      ),
      Meal(
        id: 'c3',
        name: 'Shaker protéiné & pomme',
        type: MealType.snack,
        calories: 200,
        proteinG: 25,
        carbsG: 20,
        fatG: 3,
        ingredients: const ['1 dose whey', '1 pomme'],
        imageUrl: _img(_shake),
      ),
      Meal(
        id: 'c4',
        name: 'Dinde, courgettes & riz de chou-fleur',
        type: MealType.dinner,
        calories: 420,
        proteinG: 40,
        carbsG: 22,
        fatG: 16,
        ingredients: const ['150g dinde', 'courgettes', 'chou-fleur'],
        imageUrl: _img(_turkey),
      ),
    ],
  ),
  NutritionPlan(
    id: 'plan_bulk',
    title: 'Prise de Masse',
    description:
        'Surplus calorique propre pour construire du muscle, riche en '
        'protéines et glucides complexes.',
    goal: Goal.buildMuscle,
    targetCalories: 2800,
    isPremium: true,
    meals: [
      Meal(
        id: 'b1',
        name: 'Œufs, avocat & pain complet',
        type: MealType.breakfast,
        calories: 620,
        proteinG: 30,
        carbsG: 50,
        fatG: 32,
        ingredients: const ['3 œufs', '1/2 avocat', '2 tranches pain complet'],
        imageUrl: _img(_avocado),
      ),
      Meal(
        id: 'b2',
        name: 'Bœuf, pâtes complètes & légumes',
        type: MealType.lunch,
        calories: 820,
        proteinG: 52,
        carbsG: 90,
        fatG: 24,
        ingredients: const ['180g bœuf', '120g pâtes', 'légumes'],
        imageUrl: _img(_pasta),
      ),
      Meal(
        id: 'b3',
        name: 'Gainer maison & beurre de cacahuète',
        type: MealType.snack,
        calories: 480,
        proteinG: 35,
        carbsG: 55,
        fatG: 12,
        ingredients: const ['whey', 'avoine', 'beurre de cacahuète', 'lait'],
        imageUrl: _img(_peanut),
      ),
      Meal(
        id: 'b4',
        name: 'Poulet, pommes de terre & haricots',
        type: MealType.dinner,
        calories: 680,
        proteinG: 50,
        carbsG: 60,
        fatG: 20,
        ingredients: const ['200g poulet', '250g pommes de terre', 'haricots verts'],
        imageUrl: _img(_potato),
      ),
    ],
  ),
];
