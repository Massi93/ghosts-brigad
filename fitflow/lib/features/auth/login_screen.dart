import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/common_widgets.dart';
import '../../providers/user_provider.dart';
import 'animated_fitness_hero.dart';

/// Email + social login / sign-up screen.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _isSignUp = true;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final user = context.read<UserProvider>();
    if (_isSignUp) {
      await user.signUp(
        name: _name.text,
        email: _email.text,
        password: _password.text,
      );
    } else {
      await user.signIn(email: _email.text, password: _password.text);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<UserProvider>();
    return Scaffold(
      body: Stack(
        children: [
          // Animated fitness hero (man + woman gym scenes, cross-fade + ken-burns).
          const Positioned.fill(child: AnimatedFitnessHero()),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 20),
                  _Logo(),
                  const SizedBox(height: 8),
                  const Center(
                    child: Text(
                      AppConstants.tagline,
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                  ),
                  const SizedBox(height: 36),
                  Text(
                    _isSignUp ? 'Créer un compte' : 'Content de te revoir',
                    style: const TextStyle(
                        fontSize: 24, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 20),
                  if (_isSignUp)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: TextFormField(
                        controller: _name,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(
                          hintText: 'Prénom',
                          prefixIcon: Icon(Icons.person_outline),
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty)
                            ? 'Entre ton prénom'
                            : null,
                      ),
                    ),
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      hintText: 'Email',
                      prefixIcon: Icon(Icons.mail_outline),
                    ),
                    validator: (v) => (v == null || !v.contains('@'))
                        ? 'Email invalide'
                        : null,
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _password,
                    obscureText: true,
                    decoration: const InputDecoration(
                      hintText: 'Mot de passe',
                      prefixIcon: Icon(Icons.lock_outline),
                    ),
                    validator: (v) => (v == null || v.length < 6)
                        ? '6 caractères minimum'
                        : null,
                  ),
                  const SizedBox(height: 24),
                  GradientButton(
                    label: _isSignUp ? 'S\'inscrire' : 'Se connecter',
                    loading: user.isLoading,
                    onPressed: _submit,
                  ),
                  const SizedBox(height: 16),
                  const Row(
                    children: [
                      Expanded(child: Divider()),
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: 12),
                        child: Text('ou',
                            style: TextStyle(color: AppColors.textMuted)),
                      ),
                      Expanded(child: Divider()),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _SocialButton(
                    icon: Icons.g_mobiledata,
                    label: 'Continuer avec Google',
                    onTap: () async {
                      await context
                          .read<UserProvider>()
                          .signInWithProvider('google');
                    },
                  ),
                  const SizedBox(height: 12),
                  _SocialButton(
                    icon: Icons.apple,
                    label: 'Continuer avec Apple',
                    onTap: () async {
                      await context
                          .read<UserProvider>()
                          .signInWithProvider('apple');
                    },
                  ),
                  const SizedBox(height: 24),
                  Center(
                    child: TextButton(
                      onPressed: () =>
                          setState(() => _isSignUp = !_isSignUp),
                      child: Text(
                        _isSignUp
                            ? 'Déjà un compte ? Se connecter'
                            : 'Pas de compte ? S\'inscrire',
                        style: const TextStyle(color: AppColors.primary),
                      ),
                    ),
                  ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Logo extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Premium mark — gradient disc + glowing bolt.
          Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withOpacity(0.55),
                  blurRadius: 30,
                  spreadRadius: 2,
                ),
                BoxShadow(
                  color: Colors.black.withOpacity(0.4),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: const Icon(
              Icons.fitness_center,
              color: Colors.black,
              size: 50,
            ),
          ),
          const SizedBox(height: 14),
          // App name with subtle gradient shader.
          ShaderMask(
            shaderCallback: (r) => AppColors.primaryGradient.createShader(r),
            child: const Text(
              AppConstants.appName,
              style: TextStyle(
                fontSize: 44,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                letterSpacing: 1.2,
                height: 1.0,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SocialButton extends StatelessWidget {
  const _SocialButton(
      {required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, color: AppColors.textPrimary),
      label: Text(label, style: const TextStyle(color: AppColors.textPrimary)),
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 14),
        side: const BorderSide(color: AppColors.surfaceAlt),
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }
}
