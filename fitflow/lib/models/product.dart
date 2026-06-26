enum ProductCategory { protein, bars, supplements, accessories }

extension ProductCategoryX on ProductCategory {
  String get label => switch (this) {
        ProductCategory.protein => 'Protéines',
        ProductCategory.bars => 'Barres',
        ProductCategory.supplements => 'Suppléments',
        ProductCategory.accessories => 'Accessoires',
      };
}

/// A shop product (protein powder, energy bar, supplement…).
class Product {
  final String id;
  final String name;
  final String description;
  final ProductCategory category;
  final double priceEur;
  final double? oldPriceEur;
  final double rating;
  final int reviews;
  final String imageUrl;
  final bool inStock;

  const Product({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    required this.priceEur,
    this.oldPriceEur,
    this.rating = 4.5,
    this.reviews = 0,
    required this.imageUrl,
    this.inStock = true,
  });

  bool get hasDiscount => oldPriceEur != null && oldPriceEur! > priceEur;
  int get discountPct =>
      hasDiscount ? (((oldPriceEur! - priceEur) / oldPriceEur!) * 100).round() : 0;
}

/// A line item in the shopping cart.
class CartItem {
  final Product product;
  int quantity;
  CartItem({required this.product, this.quantity = 1});
  double get subtotal => product.priceEur * quantity;
}
