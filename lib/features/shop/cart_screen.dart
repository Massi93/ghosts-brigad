import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/common_widgets.dart';
import '../../providers/shop_provider.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  Future<void> _checkout(BuildContext context) async {
    final shop = context.read<ShopProvider>();
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );
    final ok = await shop.checkout();
    if (!context.mounted) return;
    Navigator.pop(context); // loader
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text(ok ? 'Commande confirmée ! 🎉' : 'Erreur'),
        content: Text(ok
            ? 'Merci pour ta commande. Tu recevras un email de confirmation.'
            : 'Le paiement a échoué, réessaie.'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final shop = context.watch<ShopProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Mon panier')),
      body: shop.cartIsEmpty
          ? const EmptyState(
              icon: Icons.shopping_cart_outlined,
              title: 'Ton panier est vide',
              subtitle: 'Découvre nos produits dans la boutique.',
            )
          : Column(
              children: [
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: shop.cartItems.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (_, i) {
                      final item = shop.cartItems[i];
                      return Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.card,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: CachedNetworkImage(
                                imageUrl: item.product.imageUrl,
                                width: 64,
                                height: 64,
                                fit: BoxFit.cover,
                                errorWidget: (_, __, ___) => Container(
                                  width: 64,
                                  height: 64,
                                  color: AppColors.surfaceAlt,
                                  child: const Icon(Icons.image,
                                      color: AppColors.textMuted),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item.product.name,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                          fontSize: 14)),
                                  const SizedBox(height: 4),
                                  Text(
                                      '${item.product.priceEur.toStringAsFixed(2)} €',
                                      style: const TextStyle(
                                          color: AppColors.primary,
                                          fontWeight: FontWeight.w700)),
                                ],
                              ),
                            ),
                            Row(
                              children: [
                                _iconBtn(Icons.remove,
                                    () => shop.remove(item.product)),
                                Padding(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8),
                                  child: Text('${item.quantity}',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold)),
                                ),
                                _iconBtn(
                                    Icons.add, () => shop.add(item.product)),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: const BoxDecoration(
                    color: AppColors.surface,
                    borderRadius:
                        BorderRadius.vertical(top: Radius.circular(24)),
                  ),
                  child: SafeArea(
                    top: false,
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Total',
                                style: TextStyle(
                                    fontSize: 16,
                                    color: AppColors.textSecondary)),
                            Text('${shop.cartTotal.toStringAsFixed(2)} €',
                                style: const TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.w900)),
                          ],
                        ),
                        const SizedBox(height: 16),
                        GradientButton(
                          label: 'Payer maintenant',
                          icon: Icons.lock,
                          onPressed: () => _checkout(context),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Paiement sécurisé via Stripe',
                          style: TextStyle(
                              color: AppColors.textMuted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _iconBtn(IconData icon, VoidCallback onTap) => InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: AppColors.surfaceAlt,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 18, color: AppColors.primary),
        ),
      );
}
