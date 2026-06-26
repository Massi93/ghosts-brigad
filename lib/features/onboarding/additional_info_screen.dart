import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/common_widgets.dart';
import '../../providers/user_provider.dart';

/// Civil-status form shown right after a Google / Apple sign-up (and once
/// after the very first email sign-up if details are missing). Captures first
/// name, last name, age and phone number, then writes them back to the user
/// profile so they're saved in Firestore (or locally in demo mode).
class AdditionalInfoScreen extends StatefulWidget {
  const AdditionalInfoScreen({super.key});

  @override
  State<AdditionalInfoScreen> createState() => _AdditionalInfoScreenState();
}

class _AdditionalInfoScreenState extends State<AdditionalInfoScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _firstName;
  late final TextEditingController _lastName;
  late final TextEditingController _age;
  late final TextEditingController _phone;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final profile = context.read<UserProvider>().profile;
    _firstName = TextEditingController(text: profile?.firstName ?? '');
    _lastName = TextEditingController(text: profile?.lastName ?? '');
    _age = TextEditingController(
        text: (profile?.age != null && profile!.age > 0)
            ? profile.age.toString()
            : '');
    _phone = TextEditingController(text: profile?.phone ?? '');
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _age.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final user = context.read<UserProvider>();
    final current = user.profile!;
    final first = _firstName.text.trim();
    final last = _lastName.text.trim();
    final updated = current.copyWith(
      firstName: first,
      lastName: last,
      name: '$first $last'.trim(),
      age: int.tryParse(_age.text.trim()) ?? current.age,
      phone: _phone.text.trim(),
      detailsComplete: true,
    );
    await user.updateProfile(updated);
    // The webhook relay fires after onboarding completes (level / goal /
    // weight / height available) — see OnboardingScreen._next.
    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 12),
                const Text('Quelques infos',
                    style: TextStyle(
                        fontSize: 28, fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                const Text(
                  'On termine ta création de compte. Ces informations seront enregistrées dans ton profil.',
                  style: TextStyle(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 28),
                TextFormField(
                  controller: _firstName,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(
                    hintText: 'Prénom',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                  validator: (v) => (v == null || v.trim().isEmpty)
                      ? 'Entre ton prénom'
                      : null,
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _lastName,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(
                    hintText: 'Nom',
                    prefixIcon: Icon(Icons.badge_outlined),
                  ),
                  validator: (v) => (v == null || v.trim().isEmpty)
                      ? 'Entre ton nom'
                      : null,
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _age,
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(3),
                  ],
                  decoration: const InputDecoration(
                    hintText: 'Âge',
                    prefixIcon: Icon(Icons.cake_outlined),
                  ),
                  validator: (v) {
                    final n = int.tryParse(v?.trim() ?? '');
                    if (n == null) return 'Entre ton âge';
                    if (n < 13 || n > 100) return 'Âge invalide';
                    return null;
                  },
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9+ ]')),
                    LengthLimitingTextInputFormatter(20),
                  ],
                  decoration: const InputDecoration(
                    hintText: 'Numéro de téléphone',
                    prefixIcon: Icon(Icons.phone_outlined),
                  ),
                  validator: (v) {
                    final s = v?.replaceAll(RegExp(r'\D'), '') ?? '';
                    if (s.length < 8) return 'Numéro invalide';
                    return null;
                  },
                ),
                const SizedBox(height: 28),
                GradientButton(
                  label: 'Continuer',
                  icon: Icons.arrow_forward,
                  loading: _saving,
                  onPressed: _submit,
                ),
                const SizedBox(height: 8),
                const Center(
                  child: Text(
                    'Tes infos sont enregistrées dans ton profil sécurisé.',
                    style: TextStyle(
                        color: AppColors.textMuted, fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
