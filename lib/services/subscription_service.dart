import '../core/constants/app_constants.dart';
import 'storage_service.dart';

enum SubscriptionTier { free, premium }

/// In-app subscription / purchase abstraction.
///
/// The default implementation persists entitlement locally for demo. In
/// production, back this with **RevenueCat** (recommended, cross-platform) or
/// StoreKit/Play Billing directly. The rest of the app only depends on
/// [isPremium] + [purchasePremium], so swapping the backend is isolated here.
///
/// RevenueCat wiring (see docs/SETUP.md):
///   await Purchases.configure(PurchasesConfiguration(Env.revenueCatKey));
///   final info = await Purchases.purchasePackage(package);
///   isPremium = info.entitlements.active.containsKey('premium');
class SubscriptionService {
  SubscriptionService(this._storage);

  final StorageService _storage;

  SubscriptionTier get tier {
    final isPremium = _storage.readBool(AppConstants.kSubscription);
    return isPremium ? SubscriptionTier.premium : SubscriptionTier.free;
  }

  bool get isPremium => tier == SubscriptionTier.premium;

  /// Simulate a store purchase flow.
  Future<bool> purchasePremium() async {
    await Future<void>.delayed(const Duration(milliseconds: 800));
    await _storage.writeBool(AppConstants.kSubscription, true);
    return true;
  }

  Future<void> restorePurchases() async {
    await Future<void>.delayed(const Duration(milliseconds: 500));
    // In production, ask RevenueCat/the store and update local entitlement.
  }

  Future<void> cancel() async {
    await _storage.writeBool(AppConstants.kSubscription, false);
  }
}
