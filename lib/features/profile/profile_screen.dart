import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/common_widgets.dart';
import '../../core/widgets/paywall_sheet.dart';
import '../../providers/user_provider.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<UserProvider>();
    final profile = user.profile!;

    return Scaffold(
      appBar: AppBar(title: const Text('Profil')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(
            child: Column(
              children: [
                CircleAvatar(
                  radius: 44,
                  backgroundColor: AppColors.primary,
                  child: Text(
                    profile.name.isNotEmpty
                        ? profile.name[0].toUpperCase()
                        : '?',
                    style: const TextStyle(
                        color: Colors.black,
                        fontSize: 36,
                        fontWeight: FontWeight.w900),
                  ),
                ),
                const SizedBox(height: 12),
                Text(profile.name,
                    style: const TextStyle(
                        fontSize: 22, fontWeight: FontWeight.w800)),
                Text(profile.email,
                    style: const TextStyle(color: AppColors.textSecondary)),
                const SizedBox(height: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    gradient: user.isPremium
                        ? AppColors.premiumGradient
                        : null,
                    color: user.isPremium ? null : AppColors.surfaceAlt,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    user.isPremium ? '★ Membre Premium' : 'Compte Gratuit',
                    style: TextStyle(
                        color: user.isPremium
                            ? Colors.black
                            : AppColors.textSecondary,
                        fontWeight: FontWeight.w700,
                        fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          // Body stats
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _stat('${profile.age}', 'ans'),
                _divider(),
                _stat('${profile.heightCm.round()}', 'cm'),
                _divider(),
                _stat('${profile.weightKg.round()}', 'kg'),
                _divider(),
                _stat(profile.bmi.toStringAsFixed(1), 'IMC'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (profile.phone != null && profile.phone!.isNotEmpty)
            _infoTile(Icons.phone, 'Téléphone', profile.phone!),
          _infoTile(Icons.flag, 'Objectif', profile.goal.label),
          _infoTile(Icons.bar_chart, 'Niveau', profile.level.label),
          _infoTile(Icons.local_fire_department, 'Besoin calorique',
              '${profile.estimatedDailyCalories.round()} kcal/j'),
          _infoTile(Icons.favorite, 'Catégorie IMC', profile.bmiCategory),
          const SizedBox(height: 24),
          if (!user.isPremium)
            GradientButton(
              label: 'Passer Premium · ${AppConstants.premiumMonthlyPriceEur.toStringAsFixed(2)} €/mois',
              icon: Icons.workspace_premium,
              gradient: AppColors.premiumGradient,
              onPressed: () => PaywallSheet.show(context),
            )
          else
            OutlinedButton.icon(
              onPressed: () => user.cancelPremium(),
              icon: const Icon(Icons.cancel_outlined),
              label: const Text('Annuler l\'abonnement'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                side: const BorderSide(color: AppColors.surfaceAlt),
              ),
            ),
          const SizedBox(height: 12),
          TextButton.icon(
            onPressed: () => _confirmSignOut(context, user),
            icon: const Icon(Icons.logout, color: AppColors.error),
            label: const Text('Se déconnecter',
                style: TextStyle(color: AppColors.error)),
          ),
          const SizedBox(height: 8),
          const Center(
            child: Text('FitFlow v1.0.0',
                style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
          ),
        ],
      ),
    );
  }

  void _confirmSignOut(BuildContext context, UserProvider user) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Se déconnecter ?'),
        content: const Text('Tu devras te reconnecter pour accéder à ton compte.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context);
              user.signOut();
            },
            child: const Text('Déconnexion',
                style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }

  Widget _stat(String value, String label) => Column(
        children: [
          Text(value,
              style: const TextStyle(
                  fontSize: 20, fontWeight: FontWeight.w800)),
          Text(label,
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 12)),
        ],
      );

  Widget _divider() =>
      Container(height: 32, width: 1, color: AppColors.surfaceAlt);

  Widget _infoTile(IconData icon, String label, String value) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.primary, size: 20),
            const SizedBox(width: 14),
            Text(label, style: const TextStyle(color: AppColors.textSecondary)),
            const Spacer(),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
          ],
        ),
      );
}
