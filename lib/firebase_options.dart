// GENERATED FILE — TEMPLATE.
//
// This is a placeholder so the project compiles before Firebase is configured.
// Replace it by running:
//
//   dart pub global activate flutterfire_cli
//   flutterfire configure
//
// which generates the real values for each platform. See docs/FIREBASE.md.
//
// ignore_for_file: type=lint
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Default [FirebaseOptions] for use with your Firebase apps.
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        return ios;
      default:
        throw UnsupportedError(
          'FirebaseOptions are not configured for this platform. '
          'Run `flutterfire configure` to regenerate firebase_options.dart.',
        );
    }
  }

  // ⚠️ Placeholder values — replace via `flutterfire configure`.
  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'REPLACE_ME',
    appId: 'REPLACE_ME',
    messagingSenderId: 'REPLACE_ME',
    projectId: 'fitflow-app',
    authDomain: 'fitflow-app.firebaseapp.com',
    storageBucket: 'fitflow-app.appspot.com',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'REPLACE_ME',
    appId: 'REPLACE_ME',
    messagingSenderId: 'REPLACE_ME',
    projectId: 'fitflow-app',
    storageBucket: 'fitflow-app.appspot.com',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'REPLACE_ME',
    appId: 'REPLACE_ME',
    messagingSenderId: 'REPLACE_ME',
    projectId: 'fitflow-app',
    storageBucket: 'fitflow-app.appspot.com',
    iosBundleId: 'com.fitflow.app',
  );
}
