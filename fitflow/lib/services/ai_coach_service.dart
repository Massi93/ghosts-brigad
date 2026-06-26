import 'dart:convert';
import 'package:http/http.dart' as http;

import '../core/constants/env.dart';
import '../models/chat_message.dart';
import '../models/user_profile.dart';
import '../core/constants/app_constants.dart';

/// Personalised AI fitness coach.
///
/// Uses the OpenAI Chat Completions API when [Env.openAiApiKey] is provided,
/// with a carefully engineered system prompt tailored to the user's level &
/// goal. When no key is configured it transparently falls back to an offline,
/// rule-based coach so the app remains fully functional in demo / free tier.
class AiCoachService {
  static const _endpoint = 'https://api.openai.com/v1/chat/completions';

  /// Build the system prompt that conditions the coach on the user's profile.
  String buildSystemPrompt(UserProfile profile) {
    final levelFr = profile.level.label;
    final goalFr = profile.goal.label;
    return '''
Tu es "Coach Flow", le coach sportif et nutritionnel personnel de l'application FitFlow.
Tu t'adresses à ${profile.name}, ${profile.age} ans, niveau $levelFr, objectif principal: $goalFr.
Données: ${profile.weightKg.toStringAsFixed(0)} kg, ${profile.heightCm.toStringAsFixed(0)} cm, IMC ${profile.bmi.toStringAsFixed(1)} (${profile.bmiCategory}).

Règles:
- Réponds en français, ton motivant, bienveillant et concret.
- Adapte TOUJOURS la difficulté et le vocabulaire au niveau "$levelFr".
- Donne des conseils actionnables: séries, répétitions, temps de repos, fréquence.
- Pour la nutrition, donne des ordres de grandeur (calories, protéines) cohérents avec l'objectif.
- Sécurité d'abord: rappelle l'échauffement et conseille un avis médical en cas de douleur ou pathologie.
- Tu n'es pas médecin: ne pose jamais de diagnostic.
- Sois concis (max ~180 mots) sauf si on te demande un programme détaillé.
''';
  }

  /// Send the conversation to the model and return the assistant reply.
  Future<String> sendMessage({
    required UserProfile profile,
    required List<ChatMessage> history,
    required String userMessage,
  }) async {
    if (!Env.hasOpenAi) {
      return _offlineReply(profile, userMessage);
    }

    try {
      final messages = <Map<String, String>>[
        {'role': 'system', 'content': buildSystemPrompt(profile)},
        ...history
            .where((m) => m.role != ChatRole.system)
            .map((m) => m.toOpenAi()),
        {'role': 'user', 'content': userMessage},
      ];

      final res = await http
          .post(
            Uri.parse(_endpoint),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${Env.openAiApiKey}',
            },
            body: jsonEncode({
              'model': Env.openAiModel,
              'messages': messages,
              'temperature': 0.7,
              'max_tokens': 400,
            }),
          )
          .timeout(const Duration(seconds: 30));

      if (res.statusCode == 200) {
        final data = jsonDecode(utf8.decode(res.bodyBytes))
            as Map<String, dynamic>;
        final choices = data['choices'] as List;
        return (choices.first['message']['content'] as String).trim();
      }
      // Graceful degradation on API errors (rate limit, quota…).
      return _offlineReply(profile, userMessage);
    } catch (_) {
      return _offlineReply(profile, userMessage);
    }
  }

  /// Lightweight offline coach: keyword routing tuned to fitness level.
  String _offlineReply(UserProfile profile, String message) {
    final m = message.toLowerCase();
    final level = profile.level;

    String byLevel(String beginner, String inter, String pro) =>
        switch (level) {
          FitnessLevel.beginner => beginner,
          FitnessLevel.intermediate => inter,
          FitnessLevel.professional => pro,
        };

    if (m.contains('muscle') || m.contains('masse') || m.contains('prendre')) {
      return byLevel(
        "Pour débuter en prise de muscle : 3 séances/semaine full-body, 3 séries de 10-12 répétitions sur les mouvements de base (squat, pompes, rowing). Repos 90s. Vise ~1,6 g de protéines/kg/jour. 💪",
        "En intermédiaire, passe sur un split haut/bas 4x/semaine, 4 séries de 8-10 reps proche de l'échec. Surcharge progressive chaque semaine. Protéines ~1,8 g/kg, léger surplus calorique (+300 kcal).",
        "Niveau pro : périodisation en blocs (force/hypertrophie), 5-6 séances, intensité 75-85% 1RM, gestion du volume par groupe (12-20 séries/sem). Cycle tes calories autour des séances clés.",
      );
    }
    if (m.contains('maigrir') ||
        m.contains('perdre') ||
        m.contains('poids') ||
        m.contains('gras')) {
      return byLevel(
        "Pour perdre du poids en douceur : combine 3 séances cardio léger (marche rapide/vélo 30 min) + 2 séances renforcement. Léger déficit (~-400 kcal). Vise -0,5 kg/semaine, c'est durable ! 🔥",
        "Ajoute du HIIT 2x/semaine (15-20 min) en plus du renforcement. Garde les protéines hautes (1,8 g/kg) pour préserver le muscle pendant le déficit.",
        "Recomp avancée : déficit modéré, maintien d'un volume de force élevé, cardio à jeun optionnel, refeed hebdo. Surveille la performance comme indicateur de récupération.",
      );
    }
    if (m.contains('nutrition') ||
        m.contains('manger') ||
        m.contains('repas') ||
        m.contains('protéin')) {
      final kcal = profile.estimatedDailyCalories.round();
      return "Pour ton objectif (${profile.goal.label}), vise environ $kcal kcal/jour, réparties en 3 repas + 1 collation. Priorité aux protéines (~${(profile.weightKg * 1.7).round()} g/jour), légumes à volonté, glucides autour des entraînements. 🥗";
    }
    if (m.contains('échauff') || m.contains('blessure') || m.contains('mal')) {
      return "Échauffe-toi 5-10 min (cardio léger + mobilité articulaire) avant chaque séance. En cas de douleur vive, arrête et consulte un professionnel de santé. Mieux vaut prévenir ! 🙏";
    }
    if (m.contains('programme') || m.contains('routine') || m.contains('plan')) {
      return byLevel(
        "Voici un programme débutant : Lun full-body, Mer cardio + gainage, Ven full-body. 30 min/séance suffisent pour démarrer. Régularité > intensité ! Ouvre l'onglet Entraînement pour les vidéos.",
        "Programme intermédiaire : Lun Haut, Mar Bas, Jeu Haut, Ven Bas + 1 cardio. Surcharge progressive chaque semaine.",
        "Programme pro : Push/Pull/Legs sur 6 jours avec deload toutes les 4 semaines. Module l'intensité via le RPE.",
      );
    }
    return "Je suis Coach Flow ! 💬 Pose-moi une question sur ton entraînement, ta nutrition ou tes objectifs et je te donnerai un conseil adapté à ton niveau ${profile.level.label}. (Astuce : configure la clé OpenAI pour des réponses encore plus poussées.)";
  }

  /// A short proactive daily tip for the home screen.
  String dailyTip(UserProfile profile) {
    final tips = <String>[
      "Bois au moins 1,5 L d'eau aujourd'hui pour optimiser tes performances. 💧",
      "Un bon sommeil = meilleure récupération. Vise 7-8 h cette nuit. 😴",
      "Ajoute 10 min de marche après chaque repas pour booster ta dépense. 🚶",
      "N'oublie pas tes protéines à chaque repas pour préserver ton muscle. 🍗",
      "La régularité bat l'intensité : une petite séance vaut mieux que zéro. 🔥",
    ];
    return tips[DateTime.now().day % tips.length];
  }
}
