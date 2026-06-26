import '../models/product.dart';

String _img(String q) => 'https://source.unsplash.com/featured/400x400/?$q';

final List<Product> kProducts = [
  Product(
    id: 'p_whey',
    name: 'Whey Protéine Isolate – Vanille',
    description:
        '25 g de protéines par dose, faible en sucre, idéale après l\'effort. '
        'Pot de 1 kg (33 doses).',
    category: ProductCategory.protein,
    priceEur: 34.99,
    oldPriceEur: 44.99,
    rating: 4.8,
    reviews: 1240,
    imageUrl: _img('protein-powder'),
  ),
  Product(
    id: 'p_vegan',
    name: 'Protéine Végétale – Chocolat',
    description:
        'Mélange pois & riz, 22 g de protéines, 100% végétale et digeste.',
    category: ProductCategory.protein,
    priceEur: 29.99,
    rating: 4.6,
    reviews: 530,
    imageUrl: _img('vegan-protein'),
  ),
  Product(
    id: 'p_bar_choc',
    name: 'Barres Protéinées Chocolat (x12)',
    description: '20 g de protéines par barre, parfaites en collation.',
    category: ProductCategory.bars,
    priceEur: 23.99,
    oldPriceEur: 27.99,
    rating: 4.5,
    reviews: 870,
    imageUrl: _img('protein-bar'),
  ),
  Product(
    id: 'p_bar_energy',
    name: 'Barres Énergétiques Fruits (x12)',
    description: 'Énergie longue durée à base d\'avoine et de fruits secs.',
    category: ProductCategory.bars,
    priceEur: 18.99,
    rating: 4.4,
    reviews: 410,
    imageUrl: _img('energy-bar'),
  ),
  Product(
    id: 'p_creatine',
    name: 'Créatine Monohydrate 300g',
    description:
        'Améliore la force et la récupération. 3-5 g par jour. Sans additif.',
    category: ProductCategory.supplements,
    priceEur: 19.99,
    rating: 4.9,
    reviews: 2100,
    imageUrl: _img('creatine'),
  ),
  Product(
    id: 'p_bcaa',
    name: 'BCAA 2:1:1 – Fruits Rouges',
    description: 'Acides aminés pour soutenir la récupération musculaire.',
    category: ProductCategory.supplements,
    priceEur: 24.99,
    oldPriceEur: 29.99,
    rating: 4.3,
    reviews: 360,
    imageUrl: _img('bcaa'),
  ),
  Product(
    id: 'p_shaker',
    name: 'Shaker FitFlow 600ml',
    description: 'Shaker étanche avec boule mélangeuse et compartiment.',
    category: ProductCategory.accessories,
    priceEur: 9.99,
    rating: 4.7,
    reviews: 980,
    imageUrl: _img('shaker-bottle'),
  ),
  Product(
    id: 'p_bands',
    name: 'Bandes de Résistance (set de 5)',
    description: 'Niveaux variés pour l\'entraînement à domicile.',
    category: ProductCategory.accessories,
    priceEur: 16.99,
    rating: 4.6,
    reviews: 640,
    imageUrl: _img('resistance-bands'),
  ),
];
