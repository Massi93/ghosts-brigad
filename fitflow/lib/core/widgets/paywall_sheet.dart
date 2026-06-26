import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/app_constants.dart';
import '../theme/app_colors.dart';
import '../../providers/user_provider.dart';
import 'common_widgets.dart';

/// Bottom sheet that pitches FitFlow Premium and runs the purchase flow.
class PaywallSheet extends StatefulWidget {
  const PaywallSheet({super.key, this.reason});
  final String? reason;

  static Future<void> show(BuildContext context, {String? reason}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PaywallSheet(reason: reason),
    );
  }

  @override
  State<PaywallSheet> createState() => _PaywallSheetState();
}

class _PaywallSheetState extends State<PaywallSheet> {
  bool _loading = false;

  static const _perks = [
    'Tous les programmes vidéo, tous niveaux',
    'Coach IA en illimité, 24h/24',
    'Plans nutrition illimités & personnalisés',
    'Statistiques et graphiques avancés',
    'Tous les défis et badges exclusifs',
  ];

  Future<void> _buy() async {
    setState(() => _loading = true);
    final ok = await context.read<UserProvider>().upgradeToPremium();
    if (!mounted) return;
    setState(() => _loading = false);
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(ok
            ? 'Bienvenue dans FitFlow Premium ! 🎉'
            : 'Échec de l\'achat, réessaie.'),
        backgroundColor: ok ? AppColors.primaryDark : AppColors.error,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: AppColors.textMuted,
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
          const SizedBox(height: 20),
          ShaderMask(
            shaderCallback: (r) =>
                AppColors.premiumGradient.createShader(r),
            child: const Text(
              'FitFlow Premium',
              style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: Colors.white),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            widget.reason ?? 'Débloque tout le potentiel de ton coaching.',
            style: const TextStyle(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 20),
          ..._perks.map((p) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 7),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle,
                        color: AppColors.primary, size: 22),
                    const SizedBox(width: 12),
                    Expanded(child: Text(p)),
                  ],
                ),
              )),
          const SizedBox(height: 20),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${AppConstants.premiumMonthlyPriceEur.toStringAsFixed(2)} €',
                style: const TextStyle(
                    fontSize: 32, fontWeight: FontWeight.w800),
              ),
              const Padding(
                padding: EdgeInsets.only(bottom: 6, left: 4),
                child: Text('/ mois',
                    style: TextStyle(color: AppColors.textSecondary)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          GradientButton(
            label: 'Passer Premium',
            icon: Icons.workspace_premium,
            gradient: AppColors.premiumGradient,
            loading: _loading,
            onPressed: _buy,
          ),
          const SizedBox(height: 8),
          Center(
            child: TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Plus tard',
                  style: TextStyle(color: AppColors.textSecondary)),
            ),
          ),
          Center(
            child: Text(
              'Sans engagement · Résiliable à tout moment',
              style: TextStyle(
                  color: AppColors.textMuted.withOpacity(0.8), fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}
