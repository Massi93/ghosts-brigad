import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

import '../../core/theme/app_colors.dart';

/// Premium animated background for the login / sign-up screen.
///
/// Three composited layers, designed so the hero ALWAYS looks polished even
/// when the device is offline:
///
///   1. `_MeshGradientField`  — soft moving green→blue→violet light blobs.
///      Pure paint, no network, always animates.
///   2. `_ParticleField`      — slow rising motes of light. Evokes energy
///      and motion. Pure paint, no network.
///   3. `_LottieCarousel`     — cross-fades between curated Lottie scenes of
///      stylised people doing exercises (workout, yoga, running). Renders
///      transparently on top so the painted field shows through. If the
///      LottieFiles URLs are unreachable, the carousel quietly stays blank
///      and the rest of the hero carries the screen.
///   4. Dark gradient overlay so the form on top stays legible.
class AnimatedFitnessHero extends StatelessWidget {
  const AnimatedFitnessHero({super.key});

  @override
  Widget build(BuildContext context) {
    return const Stack(
      fit: StackFit.expand,
      children: [
        _MeshGradientField(),
        _ParticleField(),
        Positioned.fill(child: _LottieCarousel()),
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              stops: [0, 0.5, 1],
              colors: [
                Color(0x44000000),
                Color(0x88000000),
                Color(0xEE0E1116),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// ===========================================================================
//  LAYER 1 — Mesh gradient: 3 large soft light blobs orbiting slowly.
// ===========================================================================
class _MeshGradientField extends StatefulWidget {
  const _MeshGradientField();

  @override
  State<_MeshGradientField> createState() => _MeshGradientFieldState();
}

class _MeshGradientFieldState extends State<_MeshGradientField>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 14),
    )..repeat();
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
      builder: (context, _) {
        return CustomPaint(
          painter: _MeshGradientPainter(_ctrl.value),
          size: Size.infinite,
        );
      },
    );
  }
}

class _MeshGradientPainter extends CustomPainter {
  _MeshGradientPainter(this.t);
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    // Charcoal base so the blobs feel like neon lights through fog.
    canvas.drawColor(AppColors.background, BlendMode.src);

    final w = size.width;
    final h = size.height;
    final blobs = <_Blob>[
      _Blob(
        color: AppColors.primary,
        cx: w * (0.30 + 0.20 * math.sin(t * 2 * math.pi)),
        cy: h * (0.25 + 0.10 * math.cos(t * 2 * math.pi)),
        r: w * 0.7,
        alpha: 0.55,
      ),
      _Blob(
        color: AppColors.accent,
        cx: w * (0.75 + 0.10 * math.cos(t * 2 * math.pi * 0.7)),
        cy: h * (0.55 + 0.15 * math.sin(t * 2 * math.pi * 0.7)),
        r: w * 0.8,
        alpha: 0.40,
      ),
      _Blob(
        color: AppColors.secondary,
        cx: w * (0.50 + 0.18 * math.sin(t * 2 * math.pi * 1.3 + 1.5)),
        cy: h * (0.80 + 0.10 * math.cos(t * 2 * math.pi * 1.3 + 1.5)),
        r: w * 0.65,
        alpha: 0.35,
      ),
    ];

    for (final blob in blobs) {
      final paint = Paint()
        ..blendMode = BlendMode.plus
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 90)
        ..shader = RadialGradient(
          colors: [
            blob.color.withOpacity(blob.alpha),
            blob.color.withOpacity(0.0),
          ],
        ).createShader(
          Rect.fromCircle(center: Offset(blob.cx, blob.cy), radius: blob.r),
        );
      canvas.drawCircle(Offset(blob.cx, blob.cy), blob.r, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _MeshGradientPainter old) => old.t != t;
}

class _Blob {
  _Blob({
    required this.color,
    required this.cx,
    required this.cy,
    required this.r,
    required this.alpha,
  });
  final Color color;
  final double cx, cy, r, alpha;
}

// ===========================================================================
//  LAYER 2 — Particle field: 32 slow-rising motes of light.
// ===========================================================================
class _ParticleField extends StatefulWidget {
  const _ParticleField();

  @override
  State<_ParticleField> createState() => _ParticleFieldState();
}

class _ParticleFieldState extends State<_ParticleField>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final List<_Particle> _particles;

  @override
  void initState() {
    super.initState();
    final rng = math.Random(42);
    _particles = List.generate(
      32,
      (_) => _Particle(
        x: rng.nextDouble(),
        y0: rng.nextDouble(),
        speed: 0.05 + rng.nextDouble() * 0.10,
        size: 1.0 + rng.nextDouble() * 2.5,
        phase: rng.nextDouble(),
        hue: rng.nextBool() ? AppColors.primary : AppColors.info,
      ),
    );
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 20),
    )..repeat();
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
      builder: (context, _) => CustomPaint(
        painter: _ParticlePainter(_particles, _ctrl.value),
        size: Size.infinite,
      ),
    );
  }
}

class _Particle {
  _Particle({
    required this.x,
    required this.y0,
    required this.speed,
    required this.size,
    required this.phase,
    required this.hue,
  });
  final double x;     // 0..1 horizontal
  final double y0;    // 0..1 base vertical position
  final double speed; // rise rate
  final double size;  // radius in px
  final double phase; // shimmer offset
  final Color hue;
}

class _ParticlePainter extends CustomPainter {
  _ParticlePainter(this.particles, this.t);
  final List<_Particle> particles;
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    for (final p in particles) {
      final y = (p.y0 - t * p.speed * 3) % 1.0;
      final yPos = (y < 0 ? y + 1 : y) * size.height;
      final shimmer =
          0.4 + 0.6 * (0.5 + 0.5 * math.sin((t + p.phase) * 2 * math.pi * 2));
      final paint = Paint()
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, p.size * 0.8)
        ..color = p.hue.withOpacity(shimmer * 0.7);
      canvas.drawCircle(Offset(p.x * size.width, yPos), p.size, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _ParticlePainter old) => old.t != t;
}

// ===========================================================================
//  LAYER 3 — Lottie carousel: cross-fades between curated fitness Lotties.
//             Silently stays empty if URLs cannot be reached.
// ===========================================================================
class _LottieCarousel extends StatefulWidget {
  const _LottieCarousel();

  /// Curated public Lottie URLs (stylised people exercising). Each one is
  /// attempted independently; failures are absorbed so the field below
  /// always carries the screen.
  static const List<String> _urls = [
    // Athletic / workout sequences from the LottieFiles community.
    'https://lottie.host/4d42d6cf-1cca-4b9c-8e6a-4d8b0a2efed2/Iaw8t4jOmh.json',
    'https://lottie.host/0e1b5e23-1c1d-4f72-a7a3-12fa0b0a3a51/h9SqHkXkXm.json',
    'https://lottie.host/9c8a9d54-22a4-4ec0-9c75-46c4c8b8c9c9/3KfHFqyHwH.json',
    'https://lottie.host/8a44ffd8-9e7f-49ec-99e9-3b4b6d52b6f5/lJfABxhVQK.json',
  ];

  @override
  State<_LottieCarousel> createState() => _LottieCarouselState();
}

class _LottieCarouselState extends State<_LottieCarousel> {
  int _index = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 7), (_) {
      if (!mounted) return;
      setState(() =>
          _index = (_index + 1) % _LottieCarousel._urls.length);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 1200),
      child: SizedBox.expand(
        key: ValueKey(_index),
        child: Opacity(
          opacity: 0.85,
          child: Lottie.network(
            _LottieCarousel._urls[_index],
            fit: BoxFit.cover,
            alignment: Alignment.center,
            repeat: true,
            errorBuilder: (_, __, ___) => const SizedBox.shrink(),
          ),
        ),
      ),
    );
  }
}
