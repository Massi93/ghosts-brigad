import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Thin wrapper over shared_preferences with JSON helpers.
///
/// This is the local persistence layer. To plug a real backend (Node.js +
/// PostgreSQL or Firebase) implement the same read/write methods against the
/// remote API — see docs/ARCHITECTURE.md.
class StorageService {
  StorageService(this._prefs);

  final SharedPreferences _prefs;

  static Future<StorageService> init() async {
    final prefs = await SharedPreferences.getInstance();
    return StorageService(prefs);
  }

  Future<void> writeJson(String key, Object value) async {
    await _prefs.setString(key, jsonEncode(value));
  }

  Map<String, dynamic>? readJsonMap(String key) {
    final raw = _prefs.getString(key);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  List<dynamic>? readJsonList(String key) {
    final raw = _prefs.getString(key);
    if (raw == null) return null;
    return jsonDecode(raw) as List<dynamic>;
  }

  bool readBool(String key, {bool fallback = false}) =>
      _prefs.getBool(key) ?? fallback;

  Future<void> writeBool(String key, bool value) =>
      _prefs.setBool(key, value);

  Future<void> remove(String key) => _prefs.remove(key);

  Future<void> clear() => _prefs.clear();
}
