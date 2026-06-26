import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/constants/env.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/paywall_sheet.dart';
import '../../models/chat_message.dart';
import '../../providers/coach_provider.dart';
import '../../providers/user_provider.dart';

class CoachScreen extends StatefulWidget {
  const CoachScreen({super.key});

  @override
  State<CoachScreen> createState() => _CoachScreenState();
}

class _CoachScreenState extends State<CoachScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();

  static const _suggestions = [
    'Crée-moi un programme pour la semaine',
    'Comment perdre du gras ?',
    'Combien de protéines par jour ?',
    'Un conseil pour rester motivé',
  ];

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send(String text) async {
    final user = context.read<UserProvider>();
    final coach = context.read<CoachProvider>();
    if (!coach.remainingFor(premium: user.isPremium)) {
      PaywallSheet.show(context,
          reason: 'Limite quotidienne atteinte. Passe Premium pour discuter sans limite.');
      return;
    }
    _input.clear();
    await coach.send(user.profile!, text, premium: user.isPremium);
    _scrollDown();
  }

  void _scrollDown() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent + 120,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final coach = context.watch<CoachProvider>();
    final user = context.watch<UserProvider>();
    final messages = coach.messages;

    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            CircleAvatar(
              radius: 16,
              backgroundColor: AppColors.primary,
              child: Icon(Icons.psychology, color: Colors.black, size: 18),
            ),
            SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Coach Flow', style: TextStyle(fontSize: 16)),
                Text('Ton coach IA personnel',
                    style: TextStyle(
                        fontSize: 11, color: AppColors.textSecondary)),
              ],
            ),
          ],
        ),
        actions: [
          if (messages.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_outline),
              onPressed: () => coach.clear(),
            ),
        ],
      ),
      body: Column(
        children: [
          if (!user.isPremium)
            Container(
              width: double.infinity,
              color: AppColors.surfaceAlt,
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
              child: Text(
                'Gratuit : ${coach.freeMessagesLeft()} message(s) restant(s) aujourd\'hui',
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 12, color: AppColors.textSecondary),
              ),
            ),
          Expanded(
            child: messages.isEmpty
                ? _Welcome(
                    onSuggestion: _send,
                    suggestions: _suggestions,
                    offline: !Env.hasOpenAi,
                  )
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.all(16),
                    itemCount: messages.length + (coach.isTyping ? 1 : 0),
                    itemBuilder: (context, i) {
                      if (i >= messages.length) return const _TypingBubble();
                      return _Bubble(message: messages[i]);
                    },
                  ),
          ),
          _InputBar(controller: _input, onSend: _send),
        ],
      ),
    );
  }
}

class _Welcome extends StatelessWidget {
  const _Welcome(
      {required this.onSuggestion,
      required this.suggestions,
      required this.offline});
  final ValueChanged<String> onSuggestion;
  final List<String> suggestions;
  final bool offline;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 30),
        Center(
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              gradient: AppColors.energyGradient,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.psychology, color: Colors.white, size: 48),
          ),
        ),
        const SizedBox(height: 20),
        const Center(
          child: Text('Salut, je suis Coach Flow !',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
        ),
        const SizedBox(height: 8),
        const Center(
          child: Text(
            'Pose-moi une question sur ton entraînement ou ta nutrition.\nMes conseils s\'adaptent à ton niveau et tes objectifs.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textSecondary),
          ),
        ),
        const SizedBox(height: 28),
        ...suggestions.map((s) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: GestureDetector(
                onTap: () => onSuggestion(s),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.surfaceAlt),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.chat_bubble_outline,
                          size: 18, color: AppColors.primary),
                      const SizedBox(width: 12),
                      Expanded(child: Text(s)),
                    ],
                  ),
                ),
              ),
            )),
        if (offline)
          const Padding(
            padding: EdgeInsets.only(top: 12),
            child: Text(
              'Mode hors-ligne : réponses du moteur intégré. Configure une clé OpenAI pour des réponses encore plus poussées (voir docs/SETUP.md).',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, color: AppColors.textMuted),
            ),
          ),
      ],
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message});
  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isUser = message.isUser;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.78,
        ),
        decoration: BoxDecoration(
          gradient: isUser ? AppColors.primaryGradient : null,
          color: isUser ? null : AppColors.card,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(isUser ? 18 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 18),
          ),
        ),
        child: Text(
          message.content,
          style: TextStyle(
            color: isUser ? Colors.black : AppColors.textPrimary,
            height: 1.4,
          ),
        ),
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();
  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(18),
        ),
        child: const SizedBox(
          width: 40,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _Dot(), _Dot(), _Dot(),
            ],
          ),
        ),
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot();
  @override
  Widget build(BuildContext context) => const CircleAvatar(
      radius: 4, backgroundColor: AppColors.textSecondary);
}

class _InputBar extends StatelessWidget {
  const _InputBar({required this.controller, required this.onSend});
  final TextEditingController controller;
  final ValueChanged<String> onSend;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
        color: AppColors.surface,
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                minLines: 1,
                maxLines: 4,
                textInputAction: TextInputAction.send,
                onSubmitted: (v) {
                  if (v.trim().isNotEmpty) onSend(v.trim());
                },
                decoration: const InputDecoration(
                  hintText: 'Écris ton message…',
                  contentPadding:
                      EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () {
                final v = controller.text.trim();
                if (v.isNotEmpty) onSend(v);
              },
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: const BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.send, color: Colors.black, size: 22),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
