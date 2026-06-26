import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../providers/user_provider.dart';
import '../../services/data_export_service.dart';
import '../../services/storage_service.dart';

/// Privacy hub: open the policy, export the data, delete the account.
class PrivacyScreen extends StatefulWidget {
  const PrivacyScreen({super.key, required this.storage});
  final StorageService storage;

  @override
  State<PrivacyScreen> createState() => _PrivacyScreenState();
}

class _PrivacyScreenState extends State<PrivacyScreen> {
  bool _busy = false;

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _exportData() async {
    setState(() => _busy = true);
    try {
      final user = context.read<UserProvider>();
      final json = DataExportService(widget.storage).buildExport(user.profile);
      await Share.share(json,
          subject: 'Export de mes données FitFlow');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirmDelete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Supprimer définitivement ton compte ?'),
        content: const Text(
          'Cette action est IRRÉVERSIBLE. Toutes tes données (profil, '
          'progression, séances, repas, points, conversations avec le coach) '
          'seront effacées.\n\nUn email de confirmation peut t\'être envoyé.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Tout supprimer',
                style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _busy = true);
    final user = context.read<UserProvider>();
    final success = await user.deleteAccount();
    if (!mounted) return;
    setState(() => _busy = false);
    if (success) {
      Navigator.of(context).popUntil((r) => r.isFirst);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content:
                Text('Ton compte et tes données ont été supprimés.')),
      );
    } else {
      showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Text('Action impossible'),
          content: const Text(
            'Pour des raisons de sécurité, reconnecte-toi puis recommence '
            'la suppression depuis cet écran.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Confidentialité & données')),
      body: AbsorbPointer(
        absorbing: _busy,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            _tile(
              icon: Icons.description_outlined,
              title: 'Politique de confidentialité',
              subtitle: 'Ce qu\'on collecte, pourquoi, et tes droits.',
              onTap: () => _openUrl(AppConstants.privacyPolicyUrl),
            ),
            _tile(
              icon: Icons.gavel_outlined,
              title: "Conditions d'utilisation",
              subtitle: 'Le contrat qui te lie à FitFlow.',
              onTap: () => _openUrl(AppConstants.termsOfServiceUrl),
            ),
            _tile(
              icon: Icons.email_outlined,
              title: 'Nous contacter',
              subtitle: AppConstants.supportEmail,
              onTap: () => _openUrl('mailto:${AppConstants.supportEmail}'),
            ),
            const SizedBox(height: 24),
            const Text('Tes droits',
                style: TextStyle(
                    fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            _tile(
              icon: Icons.download_outlined,
              title: 'Exporter mes données',
              subtitle:
                  'Télécharge un fichier JSON complet de tout ce qu\'on stocke.',
              onTap: _exportData,
              color: AppColors.info,
            ),
            _tile(
              icon: Icons.delete_forever_outlined,
              title: 'Supprimer mon compte',
              subtitle:
                  'Efface définitivement ton compte et toutes tes données.',
              onTap: _confirmDelete,
              color: AppColors.error,
            ),
            if (_busy) ...[
              const SizedBox(height: 24),
              const Center(child: CircularProgressIndicator()),
            ],
          ],
        ),
      ),
    );
  }

  Widget _tile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    Color color = AppColors.primary,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
      ),
      child: ListTile(
        leading: Icon(icon, color: color),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text(subtitle,
            style: const TextStyle(color: AppColors.textSecondary)),
        trailing: const Icon(Icons.chevron_right, color: AppColors.textMuted),
        onTap: onTap,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }
}
