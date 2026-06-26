import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/common_widgets.dart';
import '../../providers/user_provider.dart';

/// GDPR-compliant consent gate shown once, right after sign-in. The user must
/// explicitly tick the box before continuing — pre-checked boxes are not
/// considered valid consent under the GDPR.
class PrivacyConsentScreen extends StatefulWidget {
  const PrivacyConsentScreen({super.key});

  @override
  State<PrivacyConsentScreen> createState() => _PrivacyConsentScreenState();
}

class _PrivacyConsentScreenState extends State<PrivacyConsentScreen> {
  bool _accepted = false;
  bool _saving = false;

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _continue() async {
    if (!_accepted) return;
    setState(() => _saving = true);
    await context.read<UserProvider>().acceptPrivacy();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 16),
              const Icon(Icons.privacy_tip_outlined,
                  size: 56, color: AppColors.primary),
              const SizedBox(height: 16),
              const Text('Confidentialité & données',
                  style: TextStyle(
                      fontSize: 26, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              const Text(
                'Avant de continuer, on a besoin de ton accord pour traiter '
                'les informations que tu vas nous fournir.',
                style: TextStyle(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 20),
              Expanded(
                child: SingleChildScrollView(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _Bullet(
                          icon: Icons.person_outline,
                          title: 'Ce qu\'on collecte',
                          body:
                              'Prénom, nom, âge, e-mail, téléphone, données '
                              'd\'entraînement (poids, IMC, séances) et '
                              'préférences alimentaires.',
                        ),
                        _Bullet(
                          icon: Icons.cloud_outlined,
                          title: 'Où sont stockées tes données',
                          body:
                              'Sur ton appareil. Si l\'app est connectée à '
                              'notre backend Firebase (hébergé en Europe), '
                              'tes données y sont aussi synchronisées pour '
                              'les retrouver sur tes autres appareils.',
                        ),
                        _Bullet(
                          icon: Icons.lock_outline,
                          title: 'Sécurité',
                          body:
                              'Connexion chiffrée HTTPS, règles d\'accès '
                              'strictes (tu es le seul à pouvoir lire ton '
                              'profil), aucun partage commercial.',
                        ),
                        _Bullet(
                          icon: Icons.shield_outlined,
                          title: 'Tes droits',
                          body:
                              'Tu peux à tout moment exporter tes données '
                              'ou supprimer ton compte depuis l\'écran '
                              'Profil. La suppression efface toutes les '
                              'données associées.',
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Checkbox(
                    value: _accepted,
                    activeColor: AppColors.primary,
                    onChanged: (v) =>
                        setState(() => _accepted = v ?? false),
                  ),
                  Expanded(
                    child: Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        const Text("J'ai lu et j'accepte la "),
                        GestureDetector(
                          onTap: () => _openUrl(AppConstants.privacyPolicyUrl),
                          child: const Text(
                            'politique de confidentialité',
                            style: TextStyle(
                              color: AppColors.primary,
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        ),
                        const Text(' et les '),
                        GestureDetector(
                          onTap: () =>
                              _openUrl(AppConstants.termsOfServiceUrl),
                          child: const Text(
                            "conditions d'utilisation",
                            style: TextStyle(
                              color: AppColors.primary,
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        ),
                        const Text('.'),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              GradientButton(
                label: 'Continuer',
                icon: Icons.arrow_forward,
                loading: _saving,
                onPressed: _accepted ? _continue : null,
              ),
              const SizedBox(height: 8),
              Center(
                child: TextButton(
                  onPressed: () => context.read<UserProvider>().signOut(),
                  child: const Text("Refuser et se déconnecter",
                      style: TextStyle(color: AppColors.textSecondary)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Bullet extends StatelessWidget {
  const _Bullet(
      {required this.icon, required this.title, required this.body});
  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.primary, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 15)),
                const SizedBox(height: 2),
                Text(body,
                    style: const TextStyle(
                        color: AppColors.textSecondary, fontSize: 13)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
