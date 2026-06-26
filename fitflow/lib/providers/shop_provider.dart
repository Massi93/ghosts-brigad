import 'package:flutter/foundation.dart';

import '../models/product.dart';
import '../services/content_service.dart';

/// Loads shop products and manages the cart.
class ShopProvider extends ChangeNotifier {
  ShopProvider(this._content) {
    load();
  }

  final ContentService _content;
  List<Product> _products = [];
  final Map<String, CartItem> _cart = {};
  ProductCategory? _filter;

  bool _loading = true;
  bool get isLoading => _loading;

  ProductCategory? get filter => _filter;

  List<Product> get products {
    if (_filter == null) return _products;
    return _products.where((p) => p.category == _filter).toList();
  }

  List<CartItem> get cartItems => _cart.values.toList();
  int get cartCount => _cart.values.fold(0, (s, i) => s + i.quantity);
  double get cartTotal => _cart.values.fold(0.0, (s, i) => s + i.subtotal);
  bool get cartIsEmpty => _cart.isEmpty;

  Future<void> load() async {
    _loading = true;
    notifyListeners();
    _products = await _content.getProducts();
    _loading = false;
    notifyListeners();
  }

  void setFilter(ProductCategory? category) {
    _filter = category;
    notifyListeners();
  }

  int quantityOf(String productId) => _cart[productId]?.quantity ?? 0;

  void add(Product product) {
    final item = _cart[product.id];
    if (item == null) {
      _cart[product.id] = CartItem(product: product);
    } else {
      item.quantity++;
    }
    notifyListeners();
  }

  void remove(Product product) {
    final item = _cart[product.id];
    if (item == null) return;
    if (item.quantity <= 1) {
      _cart.remove(product.id);
    } else {
      item.quantity--;
    }
    notifyListeners();
  }

  void clearCart() {
    _cart.clear();
    notifyListeners();
  }

  /// Simulated checkout. In production this calls your payment provider
  /// (Stripe for physical goods) and creates an order server-side.
  Future<bool> checkout() async {
    await Future<void>.delayed(const Duration(milliseconds: 900));
    clearCart();
    return true;
  }
}
