import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'core/constants/app_constants.dart';
import 'core/theme/app_theme.dart';
import 'providers/coach_provider.dart';
import 'providers/gamification_provider.dart';
import 'providers/nutrition_provider.dart';
import 'providers/progress_provider.dart';
import 'providers/shop_provider.dart';
import 'providers/user_provider.dart';
import 'providers/workout_provider.dart';
import 'services/ai_coach_service.dart';
import 'services/auth_service.dart';
import 'services/content_service.dart';
import 'services/storage_service.dart';
import 'services/subscription_service.dart';
import 'features/auth/auth_gate.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  // Bootstrap the local persistence + service layer.
  final storage = await StorageService.init();
  final content = ContentService();
  final auth = AuthService(storage);
  final subs = SubscriptionService(storage);
  final coach = AiCoachService();

  runApp(FitFlowApp(
    storage: storage,
    content: content,
    auth: auth,
    subs: subs,
    coach: coach,
  ));
}

class FitFlowApp extends StatelessWidget {
  const FitFlowApp({
    super.key,
    required this.storage,
    required this.content,
    required this.auth,
    required this.subs,
    required this.coach,
  });

  final StorageService storage;
  final ContentService content;
  final AuthService auth;
  final SubscriptionService subs;
  final AiCoachService coach;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
            create: (_) => UserProvider(auth, subs, storage)),
        ChangeNotifierProvider(
            create: (_) => WorkoutProvider(content, storage)),
        ChangeNotifierProvider(
            create: (_) => NutritionProvider(content, storage)),
        ChangeNotifierProvider(create: (_) => ProgressProvider(storage)),
        ChangeNotifierProvider(create: (_) => CoachProvider(coach, storage)),
        ChangeNotifierProvider(create: (_) => ShopProvider(content)),
        ChangeNotifierProvider(
            create: (_) => GamificationProvider(storage)),
      ],
      child: MaterialApp(
        title: AppConstants.appName,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.dark,
        home: const AuthGate(),
      ),
    );
  }
}
