/// A single meal-logging event: the meal id + when it was logged.
///
/// Used to compute per-day nutrition totals (kcal, protein, carbs, fat) so
/// the user can see what they've actually eaten today vs their target.
class LoggedMealEntry {
  final String mealId;
  final DateTime loggedAt;

  const LoggedMealEntry({required this.mealId, required this.loggedAt});

  Map<String, dynamic> toJson() => {
        'mealId': mealId,
        'loggedAt': loggedAt.toIso8601String(),
      };

  /// Backwards compatible: the previous format was a bare meal-id string
  /// (no date). When we encounter that, we attribute it to "now" so existing
  /// users don't lose their data.
  factory LoggedMealEntry.fromJson(dynamic json) {
    if (json is String) {
      return LoggedMealEntry(mealId: json, loggedAt: DateTime.now());
    }
    final m = json as Map<String, dynamic>;
    return LoggedMealEntry(
      mealId: m['mealId'] as String,
      loggedAt: DateTime.parse(m['loggedAt'] as String),
    );
  }

  /// True if [loggedAt] falls on the same calendar day as [other].
  bool isSameDay(DateTime other) =>
      loggedAt.year == other.year &&
      loggedAt.month == other.month &&
      loggedAt.day == other.day;
}
