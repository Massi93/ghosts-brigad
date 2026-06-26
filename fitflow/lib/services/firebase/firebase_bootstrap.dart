import 'package:firebase_core/firebase_core.dart';

import '../../firebase_options.dart';

/// Initialises Firebase once at app startup. Called from `main.dart` only when
/// [Env.useFirebase] is true, so default (local) builds never touch Firebase.
class FirebaseBootstrap {
  FirebaseBootstrap._();

  static bool _initialised = false;

  static Future<void> ensureInitialised() async {
    if (_initialised) return;
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    _initialised = true;
  }
}
