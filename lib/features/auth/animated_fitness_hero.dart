import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

/// Animated background for the login / sign-up screen.
///
/// Cycles through a curated set of real-photo fitness scenes (man and woman
/// training in a gym) with two layered effects:
///   • Cross-fade between photos every ~6s
///   • Continuous slow zoom ("ken-burns") on the current photo
///
/// A dark gradient overlay is applied on top so the form panel stays legible.
/// If a specific image URL ever 404s, the CachedNetworkImage errorWidget
/// renders a soft charcoal panel — the cycle continues silently.
class AnimatedFitnessHero extends StatefulWidget {
  const AnimatedFitnessHero({super.key});

  /// Curated stable Pexels image URLs (gym training, man + woman). Pexels
  /// CDN URLs are stable as long as the photo isn't removed by the author.
  static const List<String> _scenes = [
    'https://images.pexels.com/photos/1552249/pexels-photo-1552249.jpeg?auto=compress&cs=tinysrgb&w=1080',
    'https://images.pexels.com/photos/4498151/pexels-photo-4498151.jpeg?auto=compress&cs=tinysrgb&w=1080',
    'https://images.pexels.com/photos/4793361/pexels-photo-4793361.jpeg?auto=compress&cs=tinysrgb&w=1080',
    'https://images.pexels.com/photos/4498298/pexels-photo-4498298.jpeg?auto=compress&cs=tinysrgb&w=1080',
    'https://images.pexels.com/photos/2294361/pexels-photo-2294361.jpeg?auto=compress&cs=tinysrgb&w=1080',
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
    // Pre-cache the first two images so the very first transition is smooth.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      for (final url
          in AnimatedFitnessHero._scenes.take(2)) {
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
        // Each scene fades in for ~1.5s while a slow ken-burns zoom plays.
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 1500),
          switchInCurve: Curves.easeOut,
          switchOutCurve: Curves.easeIn,
          child: _KenBurnsImage(
            key: ValueKey(_index),
            url: AnimatedFitnessHero._scenes[_index],
          ),
        ),

        // Dark gradient so the form on top stays legible (lighter at top,
        // very dark at bottom where the form sits).
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              stops: [0, 0.3, 1],
              colors: [
                Color(0x99000000),
                Color(0xAA000000),
                Color(0xF20E1116),
              ],
            ),
          ),
        ),
      ],
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
        placeholder: (_, __) => Container(color: AppColors.background),
        errorWidget: (_, __, ___) => Container(color: AppColors.background),
      ),
    );
  }
}
