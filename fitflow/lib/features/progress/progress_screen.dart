import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/common_widgets.dart';
import '../../models/progress_entry.dart';
import '../../providers/gamification_provider.dart';
import '../../providers/progress_provider.dart';
import '../../providers/workout_provider.dart';
import 'gamification_screen.dart';

class ProgressScreen extends StatelessWidget {
  const ProgressScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final progress = context.watch<ProgressProvider>();
    final game = context.watch<GamificationProvider>();
    final workout = context.watch<WorkoutProvider>();
    final entries = progress.entries;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Progression'),
        actions: [
          IconButton(
            icon: const Icon(Icons.emoji_events_outlined),
            tooltip: 'Badges & défis',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const GamificationScreen()),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddSheet(context),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.black,
        icon: const Icon(Icons.add),
        label: const Text('Mesure'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
        children: [
          Row(
            children: [
              Expanded(
                child: StatCard(
                  icon: Icons.monitor_weight,
                  value: progress.latestWeight != null
                      ? '${progress.latestWeight!.toStringAsFixed(1)} kg'
                      : '—',
                  label: 'Poids actuel',
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  icon: progress.weightDelta != null &&
                          progress.weightDelta! < 0
                      ? Icons.trending_down
                      : Icons.trending_up,
                  value: progress.weightDelta != null
                      ? '${progress.weightDelta! >= 0 ? '+' : ''}${progress.weightDelta!.toStringAsFixed(1)} kg'
                      : '—',
                  label: 'Évolution',
                  color: AppColors.secondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: StatCard(
                  icon: Icons.fitness_center,
                  value: '${workout.completedCount}',
                  label: 'Séances',
                  color: AppColors.info,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  icon: Icons.local_fire_department,
                  value: '${game.state.streakDays}',
                  label: 'Série (jours)',
                  color: AppColors.warning,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const SectionHeader(title: 'Évolution du poids'),
          Container(
            height: 240,
            padding: const EdgeInsets.fromLTRB(8, 24, 16, 12),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(20),
            ),
            child: entries.length < 2
                ? const Center(
                    child: Text('Ajoute des mesures pour voir ton graphique',
                        style: TextStyle(color: AppColors.textSecondary)),
                  )
                : _WeightChart(entries: entries),
          ),
          const SizedBox(height: 24),
          const SectionHeader(title: 'Calories brûlées par séance'),
          Container(
            height: 220,
            padding: const EdgeInsets.fromLTRB(8, 24, 16, 12),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(20),
            ),
            child: entries.isEmpty
                ? const Center(
                    child: Text('Aucune donnée',
                        style: TextStyle(color: AppColors.textSecondary)),
                  )
                : _CaloriesChart(entries: entries),
          ),
        ],
      ),
    );
  }

  void _showAddSheet(BuildContext context) {
    final weightCtrl = TextEditingController(
        text: context.read<ProgressProvider>().latestWeight?.toStringAsFixed(1));
    final fatCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(
            24, 24, 24, MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Nouvelle mesure',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            TextField(
              controller: weightCtrl,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                  labelText: 'Poids (kg)',
                  prefixIcon: Icon(Icons.monitor_weight)),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: fatCtrl,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                  labelText: 'Masse grasse % (optionnel)',
                  prefixIcon: Icon(Icons.percent)),
            ),
            const SizedBox(height: 20),
            GradientButton(
              label: 'Enregistrer',
              icon: Icons.save,
              onPressed: () {
                final w = double.tryParse(weightCtrl.text.replaceAll(',', '.'));
                if (w == null) return;
                context.read<ProgressProvider>().addEntry(
                      weightKg: w,
                      bodyFatPct: double.tryParse(
                          fatCtrl.text.replaceAll(',', '.')),
                    );
                Navigator.pop(ctx);
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _WeightChart extends StatelessWidget {
  const _WeightChart({required this.entries});
  final List<ProgressEntry> entries;

  @override
  Widget build(BuildContext context) {
    final spots = <FlSpot>[
      for (int i = 0; i < entries.length; i++)
        FlSpot(i.toDouble(), entries[i].weightKg),
    ];
    final weights = entries.map((e) => e.weightKg).toList();
    final minY = (weights.reduce((a, b) => a < b ? a : b) - 2);
    final maxY = (weights.reduce((a, b) => a > b ? a : b) + 2);

    return LineChart(
      LineChartData(
        minY: minY,
        maxY: maxY,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          getDrawingHorizontalLine: (_) =>
              const FlLine(color: AppColors.surfaceAlt, strokeWidth: 1),
        ),
        titlesData: FlTitlesData(
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 36,
              getTitlesWidget: (v, _) => Text('${v.toInt()}',
                  style: const TextStyle(
                      color: AppColors.textMuted, fontSize: 10)),
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 28,
              interval:
                  (entries.length / 4).ceilToDouble().clamp(1, 999).toDouble(),
              getTitlesWidget: (v, _) {
                final i = v.toInt();
                if (i < 0 || i >= entries.length) return const SizedBox();
                return Text(DateFormat('dd/MM').format(entries[i].date),
                    style: const TextStyle(
                        color: AppColors.textMuted, fontSize: 10));
              },
            ),
          ),
        ),
        borderData: FlBorderData(show: false),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            gradient: AppColors.primaryGradient,
            barWidth: 3,
            dotData: const FlDotData(show: true),
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  AppColors.primary.withOpacity(0.25),
                  AppColors.primary.withOpacity(0.0),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CaloriesChart extends StatelessWidget {
  const _CaloriesChart({required this.entries});
  final List<ProgressEntry> entries;

  @override
  Widget build(BuildContext context) {
    final data = entries.length > 7
        ? entries.sublist(entries.length - 7)
        : entries;
    final maxY = data
            .map((e) => e.caloriesBurned)
            .fold<int>(0, (a, b) => a > b ? a : b)
            .toDouble() +
        100;

    return BarChart(
      BarChartData(
        maxY: maxY,
        gridData: const FlGridData(show: false),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 28,
              getTitlesWidget: (v, _) {
                final i = v.toInt();
                if (i < 0 || i >= data.length) return const SizedBox();
                return Text(DateFormat('dd/MM').format(data[i].date),
                    style: const TextStyle(
                        color: AppColors.textMuted, fontSize: 10));
              },
            ),
          ),
        ),
        barGroups: [
          for (int i = 0; i < data.length; i++)
            BarChartGroupData(x: i, barRods: [
              BarChartRodData(
                toY: data[i].caloriesBurned.toDouble(),
                width: 16,
                borderRadius: BorderRadius.circular(6),
                gradient: AppColors.energyGradient,
              ),
            ]),
        ],
      ),
    );
  }
}
