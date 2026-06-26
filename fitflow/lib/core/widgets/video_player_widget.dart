import 'package:cached_network_image/cached_network_image.dart';
import 'package:chewie/chewie.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../theme/app_colors.dart';

/// Plays the exercise instructional video, or shows an elegant "Coming soon"
/// hero if no real video is available yet ([url] empty). The hero uses the
/// thumbnail as a backdrop so the screen still feels rich.
class ExerciseVideoPlayer extends StatefulWidget {
  const ExerciseVideoPlayer({
    super.key,
    required this.url,
    this.thumbnailUrl,
    this.autoplay = false,
  });
  final String url;
  final String? thumbnailUrl;
  final bool autoplay;

  @override
  State<ExerciseVideoPlayer> createState() => _ExerciseVideoPlayerState();
}

class _ExerciseVideoPlayerState extends State<ExerciseVideoPlayer> {
  VideoPlayerController? _video;
  ChewieController? _chewie;
  bool _error = false;

  bool get _hasUrl => widget.url.isNotEmpty;

  @override
  void initState() {
    super.initState();
    if (_hasUrl) _init();
  }

  Future<void> _init() async {
    try {
      final controller =
          VideoPlayerController.networkUrl(Uri.parse(widget.url));
      await controller.initialize();
      if (!mounted) return;
      setState(() {
        _video = controller;
        _chewie = ChewieController(
          videoPlayerController: controller,
          autoPlay: widget.autoplay,
          looping: true,
          aspectRatio: controller.value.aspectRatio,
          materialProgressColors: ChewieProgressColors(
            playedColor: AppColors.primary,
            handleColor: AppColors.primary,
            backgroundColor: AppColors.surfaceAlt,
            bufferedColor: AppColors.textMuted,
          ),
        );
      });
    } catch (_) {
      if (mounted) setState(() => _error = true);
    }
  }

  @override
  void dispose() {
    _chewie?.dispose();
    _video?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // No URL configured → show the elegant "coming soon" hero.
    if (!_hasUrl || _error) {
      return _ComingSoonHero(thumbnailUrl: widget.thumbnailUrl);
    }
    if (_chewie == null) {
      return const AspectRatio(
        aspectRatio: 16 / 9,
        child: ColoredBox(
          color: AppColors.surfaceAlt,
          child: Center(child: CircularProgressIndicator()),
        ),
      );
    }
    return AspectRatio(
      aspectRatio: _video!.value.aspectRatio,
      child: Chewie(controller: _chewie!),
    );
  }
}

/// Elegant placeholder shown when the exercise has no real video yet.
/// Uses the thumbnail as a dimmed backdrop + a centred badge.
class _ComingSoonHero extends StatelessWidget {
  const _ComingSoonHero({this.thumbnailUrl});
  final String? thumbnailUrl;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (thumbnailUrl != null && thumbnailUrl!.isNotEmpty)
            CachedNetworkImage(
              imageUrl: thumbnailUrl!,
              fit: BoxFit.cover,
              errorWidget: (_, __, ___) =>
                  Container(color: AppColors.surfaceAlt),
            )
          else
            Container(color: AppColors.surfaceAlt),

          // Dark gradient overlay so the badge stays legible.
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0x66000000), Color(0xAA000000)],
              ),
            ),
          ),

          // Centred badge.
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.4),
                        blurRadius: 20,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.play_arrow_rounded,
                      color: Colors.black, size: 38),
                ),
                const SizedBox(height: 14),
                const Text(
                  'Vidéo bientôt disponible',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 32),
                  child: Text(
                    'Suis les instructions détaillées ci-dessous pour exécuter l\'exercice correctement.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
