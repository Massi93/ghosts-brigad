enum ChatRole { user, assistant, system }

/// A single message in the AI coach conversation.
class ChatMessage {
  final String id;
  final ChatRole role;
  final String content;
  final DateTime timestamp;

  const ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.timestamp,
  });

  bool get isUser => role == ChatRole.user;

  Map<String, dynamic> toJson() => {
        'id': id,
        'role': role.name,
        'content': content,
        'timestamp': timestamp.toIso8601String(),
      };

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        id: json['id'] as String,
        role: ChatRole.values.firstWhere(
          (r) => r.name == json['role'],
          orElse: () => ChatRole.assistant,
        ),
        content: json['content'] as String,
        timestamp: DateTime.parse(json['timestamp'] as String),
      );

  /// OpenAI chat-completions wire format.
  Map<String, String> toOpenAi() => {'role': role.name, 'content': content};
}
