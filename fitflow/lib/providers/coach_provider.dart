import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import '../core/constants/app_constants.dart';
import '../models/chat_message.dart';
import '../models/user_profile.dart';
import '../services/ai_coach_service.dart';
import '../services/storage_service.dart';

/// Drives the AI coach conversation, including the free-tier daily message cap.
class CoachProvider extends ChangeNotifier {
  CoachProvider(this._coach, this._storage) {
    _load();
  }

  final AiCoachService _coach;
  final StorageService _storage;
  final _uuid = const Uuid();

  final List<ChatMessage> _messages = [];
  bool _typing = false;
  int _messagesToday = 0;
  String _todayKey = '';

  List<ChatMessage> get messages => List.unmodifiable(_messages);
  bool get isTyping => _typing;
  int get messagesToday => _messagesToday;

  bool remainingFor({required bool premium}) =>
      premium || _messagesToday < AppConstants.freeCoachMessagesPerDay;

  int freeMessagesLeft() =>
      (AppConstants.freeCoachMessagesPerDay - _messagesToday)
          .clamp(0, AppConstants.freeCoachMessagesPerDay)
          .toInt();

  void _load() {
    final json = _storage.readJsonMap(AppConstants.kCoachHistory);
    _todayKey = _dayKey(DateTime.now());
    if (json != null) {
      final list = (json['messages'] as List?) ?? [];
      _messages.addAll(
        list.map((m) => ChatMessage.fromJson(m as Map<String, dynamic>)),
      );
      if (json['dayKey'] == _todayKey) {
        _messagesToday = (json['count'] as int?) ?? 0;
      }
    }
  }

  String _dayKey(DateTime d) => '${d.year}-${d.month}-${d.day}';

  Future<void> send(UserProfile profile, String text,
      {required bool premium}) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _typing) return;
    if (!remainingFor(premium: premium)) return;

    // Capture the conversation so far BEFORE adding the new user message,
    // so the coach service can append it once without duplication.
    final priorHistory =
        _messages.where((m) => m.role != ChatRole.system).toList();

    _messages.add(ChatMessage(
      id: _uuid.v4(),
      role: ChatRole.user,
      content: trimmed,
      timestamp: DateTime.now(),
    ));
    _typing = true;
    notifyListeners();

    final reply = await _coach.sendMessage(
      profile: profile,
      history: priorHistory,
      userMessage: trimmed,
    );

    _messages.add(ChatMessage(
      id: _uuid.v4(),
      role: ChatRole.assistant,
      content: reply,
      timestamp: DateTime.now(),
    ));
    _typing = false;
    _messagesToday++;
    await _persist();
  }

  Future<void> _persist() async {
    await _storage.writeJson(AppConstants.kCoachHistory, {
      'dayKey': _todayKey,
      'count': _messagesToday,
      'messages': _messages.map((m) => m.toJson()).toList(),
    });
    notifyListeners();
  }

  Future<void> clear() async {
    _messages.clear();
    await _storage.remove(AppConstants.kCoachHistory);
    notifyListeners();
  }
}
