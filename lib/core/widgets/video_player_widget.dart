import 'package:chewie/chewie.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../theme/app_colors.dart';

/// Reusable network video player (Chewie) for exercise/program videos.
class ExerciseVideoPlayer extends StatefulWidget {
  const ExerciseVideoPlayer({super.key, required this.url, this.autoplay = false});
  final String url;
  final bool autoplay;

  @override
  State<ExerciseVideoPlayer> createState() => _ExerciseVideoPlayerState();
}

class _ExerciseVideoPlayerState extends State<ExerciseVideoPlayer> {
  VideoPlayerController? _video;
  ChewieController? _chewie;
  bool _error = false;

  @override
  void initState() {
    super.initState();
    _init();
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
    if (_error) {
      return AspectRatio(
        aspectRatio: 16 / 9,
        child: Container(
          color: AppColors.surfaceAlt,
          child: const Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.videocam_off, color: AppColors.textMuted, size: 36),
                SizedBox(height: 8),
                Text('Vidéo indisponible',
                    style: TextStyle(color: AppColors.textSecondary)),
              ],
            ),
          ),
        ),
      );
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
