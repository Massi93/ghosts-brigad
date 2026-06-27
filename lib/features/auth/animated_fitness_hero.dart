import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

/// Animated background for the login / sign-up screen.
///
/// Two layers, in this order (bottom → top):
/// 1. Animated colour gradient that always renders — guarantees the screen
///    is alive even before the network photos arrive (or if they fail).
/// 2. Cycling real-photo fitness scenes (man and woman training in a gym)
///    with cross-fade between photos + a continuous slow "ken-burns" zoom
///    on the current photo.
/// 3. A subtle dark overlay so the form panel on top stays legible.
class AnimatedFitnessHero extends StatefulWidget {
  const AnimatedFitnessHero({super.key});

  /// Stable Unsplash photo URLs (same CDN pattern that works for meals).
  /// Each photo features people training in a gym setting.
  static const List<String> _scenes = [
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1080&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1080&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=1080&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1605296867424-35fc25c9212a?w=1080&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=1080&q=80&auto=format&fit=crop',
  ];

  @override
  State<AnimatedFitnessHero> createState() => _AnimatedFitnessHeroState();
}

class _AnimatedFitnessHeroState extends State<AnimatedFitnessHero> {
  int _index = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      for (final url in AnimatedFitnessHero._scenes.take(2)) {
        precacheImage(CachedNetworkImageProvider(url), context);
      }
    });
    _timer = Timer.periodic(const Duration(seconds: 6), (_) {
      if (!mounted) return;
      setState(() => _index =
          (_index + 1) % AnimatedFitnessHero._scenes.length);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        // Always-on animated gradient — guarantees the screen is alive.
        const _AnimatedGradientBackdrop(),

        // Cycling fitness photos with ken-burns zoom.
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 1500),
          switchInCurve: Curves.easeOut,
          switchOutCurve: Curves.easeIn,
          child: _KenBurnsImage(
            key: ValueKey(_index),
            url: AnimatedFitnessHero._scenes[_index],
          ),
        ),

        // Light dark gradient overlay (lighter at top so the photo shows,
        // heavier at bottom where the form sits).
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              stops: [0, 0.45, 1],
              colors: [
                Color(0x33000000), // 20% — keep photo visible at top
                Color(0x77000000), // 47%
                Color(0xE60E1116), // 90% — solid dark at bottom for the form
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// Animated colour gradient (electric green ↔ blue ↔ violet) that slowly
/// pulses. Visible whenever the network photos haven't loaded yet, and
/// underneath them otherwise — guarantees the screen always feels alive.
class _AnimatedGradientBackdrop extends StatefulWidget {
  const _AnimatedGradientBackdrop();

  @override
  State<_AnimatedGradientBackdrop> createState() =>
      _AnimatedGradientBackdropState();
}

class _AnimatedGradientBackdropState extends State<_AnimatedGradientBackdrop>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  static const _palette = [
    AppColors.primary,
    AppColors.accent,
    AppColors.secondary,
  ];

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, _) {
        final t = _ctrl.value;
        final a = _palette[0].withOpacity(0.30 + 0.10 * t);
        final b = _palette[1].withOpacity(0.20 + 0.15 * (1 - t));
        final c = _palette[2].withOpacity(0.25 + 0.10 * t);
        return DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment(-1 + t * 0.6, -1),
              end: Alignment(1, 1 - t * 0.6),
              colors: [AppColors.background, a, b, c, AppColors.background],
              stops: const [0, 0.25, 0.5, 0.75, 1],
            ),
          ),
        );
      },
    );
  }
}

/// A single image that slowly zooms in from 1.0 to 1.15 over ~7 seconds for
/// a subtle "ken-burns" cinematic feel.
class _KenBurnsImage extends StatefulWidget {
  const _KenBurnsImage({super.key, required this.url});
  final String url;

  @override
  State<_KenBurnsImage> createState() => _KenBurnsImageState();
}

class _KenBurnsImageState extends State<_KenBurnsImage>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 7),
    )..forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, child) {
        final scale = 1.0 + (_ctrl.value * 0.15);
        return Transform.scale(scale: scale, child: child);
      },
      child: CachedNetworkImage(
        imageUrl: widget.url,
        fit: BoxFit.cover,
        fadeInDuration: const Duration(milliseconds: 600),
        // Transparent placeholder + error: the animated gradient below
        // remains visible, no ugly dark panels overlay.
        placeholder: (_, __) => const SizedBox.expand(),
        errorWidget: (_, __, ___) => const SizedBox.expand(),
      ),
    );
  }
}
