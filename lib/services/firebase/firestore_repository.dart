import 'package:cloud_firestore/cloud_firestore.dart';

import '../../models/progress_entry.dart';

/// Cloud sync for user-scoped collections in Firestore.
///
/// Profiles are handled by [FirebaseAuthService]; this repository covers the
/// per-user time-series data (progress). To enable cloud progress sync, inject
/// this into `ProgressProvider` and mirror writes here (see docs/FIREBASE.md).
///
/// Layout: `users/{uid}/progress/{entryId}`.
class FirestoreRepository {
  FirestoreRepository(this.uid, {FirebaseFirestore? firestore})
      : _db = firestore ?? FirebaseFirestore.instance;

  final String uid;
  final FirebaseFirestore _db;

  CollectionReference<Map<String, dynamic>> get _progress =>
      _db.collection('users').doc(uid).collection('progress');

  Future<List<ProgressEntry>> fetchProgress() async {
    final snap = await _progress.orderBy('date').get();
    return snap.docs
        .map((d) => ProgressEntry.fromJson({...d.data(), 'id': d.id}))
        .toList();
  }

  Future<void> saveEntry(ProgressEntry entry) =>
      _progress.doc(entry.id).set(entry.toJson());

  Future<void> deleteEntry(String entryId) => _progress.doc(entryId).delete();

  /// One-time push of locally-stored entries to the cloud (migration helper).
  Future<void> pushAll(List<ProgressEntry> entries) async {
    final batch = _db.batch();
    for (final e in entries) {
      batch.set(_progress.doc(e.id), e.toJson());
    }
    await batch.commit();
  }
}
