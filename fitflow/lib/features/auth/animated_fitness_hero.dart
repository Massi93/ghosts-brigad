import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../../core/theme/app_colors.dart';

/// Animated background for the login / sign-up screen.
///
/// Three layers, in order (bottom → top):
/// 1. Animated colour gradient that always renders — guarantees the screen
///    is alive even before the network media arrives.
/// 2. Cycling real-photo fitness scenes with cross-fade + slow ken-burns.
///    Top-aligned BoxFit so faces stay in frame, not chopped off.
/// 3. Optional muted-looped fitness video that fades in once it has buffered.
///    If the video URL fails, the photo carousel underneath is still showing.
/// 4. Dark gradient overlay so the form stays legible.
class AnimatedFitnessHero extends StatefulWidget {
  const AnimatedFitnessHero({super.key});

  /// Curated Unsplash photo URLs — diverse cast of real people training,
  /// chosen for portrait-ish framing so faces remain visible after cover-fit.
  static const List<String> _scenes = [
    'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=1080&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1546484475-7f7bd55792da?w=1080&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1080&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1080&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1080&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=1080&q=80&auto=format&fit=crop',
  ];

  /// Pexels muted gym/workout videos. Each entry is tried in order; the
  /// first that loads becomes the background. URLs follow the stable
  /// `videos.pexels.com/video-files/{id}/...mp4` pattern.
  static const List<String> _videoUrls = [
    'https://videos.pexels.com/video-files/4761426/4761426-hd_1920_1080_25fps.mp4',
    'https://videos.pexels.com/video-files/2795746/2795746-hd_1920_1080_30fps.mp4',
    'https://videos.pexels.com/video-files/5319134/5319134-hd_1920_1080_30fps.mp4',
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
        // 1) Always-on animated gradient.
        const _AnimatedGradientBackdrop(),

        // 2) Photo carousel with subtle ken-burns, faces aligned to top.
        Positioned.fill(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 1500),
            switchInCurve: Curves.easeOut,
            switchOutCurve: Curves.easeIn,
            child: _KenBurnsImage(
              key: ValueKey(_index),
              url: AnimatedFitnessHero._scenes[_index],
            ),
          ),
        ),

        // 3) Muted-looped fitness video. Fades in only once buffered;
        //    until then (or if all URLs fail), the photos stay visible.
        const Positioned.fill(child: _FitnessVideoLayer()),

        // 4) Dark gradient overlay for form legibility (lighter at top,
        //    almost opaque at bottom where the form sits).
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              stops: [0, 0.45, 1],
              colors: [
                Color(0x33000000),
                Color(0x77000000),
                Color(0xE60E1116),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// ===========================================================================
// Layer: animated colour gradient (always on)
// ===========================================================================
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

// ===========================================================================
// Layer: ken-burns image
// ===========================================================================
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
      duration: const Duration(seconds: 10),
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
        // Gentler zoom (1.0 → 1.07) so faces stay roughly in frame.
        final scale = 1.0 + (_ctrl.value * 0.07);
        return Transform.scale(scale: scale, child: child);
      },
      child: SizedBox.expand(
        child: CachedNetworkImage(
          imageUrl: widget.url,
          fit: BoxFit.cover,
          // Top-aligned: with portrait phone screens + landscape source photos
          // the default centre alignment cuts off heads. Top alignment keeps
          // faces visible.
          alignment: Alignment.topCenter,
          fadeInDuration: const Duration(milliseconds: 600),
          placeholder: (_, __) => const SizedBox.expand(),
          errorWidget: (_, __, ___) => const SizedBox.expand(),
        ),
      ),
    );
  }
}

// ===========================================================================
// Layer: muted looping fitness video (Pexels). Fades in only when ready.
// ===========================================================================
class _FitnessVideoLayer extends StatefulWidget {
  const _FitnessVideoLayer();

  @override
  State<_FitnessVideoLayer> createState() => _FitnessVideoLayerState();
}

class _FitnessVideoLayerState extends State<_FitnessVideoLayer> {
  VideoPlayerController? _ctrl;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _tryLoad();
  }

  Future<void> _tryLoad() async {
    for (final url in AnimatedFitnessHero._videoUrls) {
      final candidate = VideoPlayerController.networkUrl(Uri.parse(url));
      try {
        await candidate.initialize();
        await candidate.setLooping(true);
        await candidate.setVolume(0);
        await candidate.play();
        if (!mounted) {
          await candidate.dispose();
          return;
        }
        setState(() {
          _ctrl = candidate;
          _ready = true;
        });
        return;
      } catch (_) {
        await candidate.dispose();
        // Try the next URL.
      }
    }
    // All URLs failed → the photo layer underneath keeps the screen alive.
  }

  @override
  void dispose() {
    _ctrl?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready || _ctrl == null) return const SizedBox.shrink();
    return AnimatedOpacity(
      opacity: 1,
      duration: const Duration(milliseconds: 800),
      child: SizedBox.expand(
        child: FittedBox(
          fit: BoxFit.cover,
          alignment: Alignment.topCenter,
          child: SizedBox(
            width: _ctrl!.value.size.width,
            height: _ctrl!.value.size.height,
            child: VideoPlayer(_ctrl!),
          ),
        ),
      ),
    );
  }
}
