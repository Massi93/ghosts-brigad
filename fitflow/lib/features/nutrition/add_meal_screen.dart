import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/common_widgets.dart';
import '../../models/logged_meal_entry.dart';
import '../../models/nutrition_plan.dart';
import '../../providers/nutrition_provider.dart';

/// Lets the user log a quick custom meal (name + macros) into today's totals
/// without it having to come from a plan template. The meal is materialised
/// as a one-off [Meal] + a [LoggedMealEntry] timestamped now, so it shows up
/// in the daily tracker like any other.
class AddMealScreen extends StatefulWidget {
  const AddMealScreen({super.key});

  @override
  State<AddMealScreen> createState() => _AddMealScreenState();
}

class _AddMealScreenState extends State<AddMealScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _calories = TextEditingController();
  final _protein = TextEditingController();
  final _carbs = TextEditingController();
  final _fat = TextEditingController();
  MealType _type = MealType.lunch;
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _calories.dispose();
    _protein.dispose();
    _carbs.dispose();
    _fat.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final id = const Uuid().v4();
    final meal = Meal(
      id: id,
      name: _name.text.trim(),
      type: _type,
      calories: int.tryParse(_calories.text) ?? 0,
      proteinG: int.tryParse(_protein.text) ?? 0,
      carbsG: int.tryParse(_carbs.text) ?? 0,
      fatG: int.tryParse(_fat.text) ?? 0,
    );
    final nutrition = context.read<NutritionProvider>();
    await nutrition.logCustomMeal(meal);
    if (mounted) Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Logger un repas')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text(
              'Ajoute un repas que tu viens de manger. Les calories et macros '
              'seront comptabilisées dans ta journée.',
              style: TextStyle(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: _name,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'Nom du repas',
                prefixIcon: Icon(Icons.restaurant),
                hintText: 'Ex: Poulet riz brocoli',
              ),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Nom requis' : null,
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.surfaceAlt,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  const Icon(Icons.schedule, color: AppColors.textSecondary),
                  const SizedBox(width: 12),
                  const Text('Type'),
                  const Spacer(),
                  DropdownButton<MealType>(
                    value: _type,
                    underline: const SizedBox.shrink(),
                    dropdownColor: AppColors.surface,
                    items: MealType.values
                        .map((t) => DropdownMenuItem(
                              value: t,
                              child: Text(t.label),
                            ))
                        .toList(),
                    onChanged: (v) =>
                        v != null ? setState(() => _type = v) : null,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            _numField(_calories, 'Calories (kcal)', Icons.local_fire_department,
                required: true),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(child: _numField(_protein, 'Protéines (g)', Icons.egg)),
                const SizedBox(width: 12),
                Expanded(child: _numField(_carbs, 'Glucides (g)', Icons.grain)),
              ],
            ),
            const SizedBox(height: 14),
            _numField(_fat, 'Lipides (g)', Icons.water_drop_outlined),
            const SizedBox(height: 24),
            GradientButton(
              label: 'Logger',
              icon: Icons.check,
              loading: _saving,
              onPressed: _save,
            ),
          ],
        ),
      ),
    );
  }

  Widget _numField(TextEditingController c, String label, IconData icon,
      {bool required = false}) {
    return TextFormField(
      controller: c,
      keyboardType: TextInputType.number,
      inputFormatters: [
        FilteringTextInputFormatter.digitsOnly,
        LengthLimitingTextInputFormatter(5),
      ],
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
      ),
      validator: (v) {
        if (!required && (v == null || v.isEmpty)) return null;
        if (int.tryParse(v ?? '') == null) return 'Nombre invalide';
        return null;
      },
    );
  }
}
