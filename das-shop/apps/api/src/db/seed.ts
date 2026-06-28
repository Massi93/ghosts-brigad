import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, sqlite } from './index.js';
import { categories, products, users, carts } from './schema.js';
import { eq } from 'drizzle-orm';

const categoriesSeed = [
  { slug: 'men', name: 'Men' },
  { slug: 'women', name: 'Women' },
  { slug: 'shoes', name: 'Shoes' },
  { slug: 'accessories', name: 'Accessories' },
  { slug: 'new-arrivals', name: 'New arrivals' },
];

const productsSeed: Array<{
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  categorySlug: string;
  imageUrl: string;
  featured?: boolean;
}> = [
  {
    slug: 'oversized-cotton-tee-black',
    name: 'Oversized cotton tee — black',
    description: 'Heavyweight 220 gsm organic cotton, drop shoulder, ribbed neckline. Unisex fit.',
    priceCents: 2490,
    categorySlug: 'men',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
    featured: true,
  },
  {
    slug: 'wide-leg-denim-indigo',
    name: 'Wide-leg denim — indigo',
    description: 'Rigid 13 oz selvedge denim, high rise, raw hem. Made in Portugal.',
    priceCents: 6990,
    categorySlug: 'men',
    imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
  },
  {
    slug: 'cropped-knit-cardigan-cream',
    name: 'Cropped knit cardigan — cream',
    description: 'Soft merino blend, mother-of-pearl buttons, cropped fit.',
    priceCents: 4990,
    categorySlug: 'women',
    imageUrl: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800',
    featured: true,
  },
  {
    slug: 'slip-midi-dress-charcoal',
    name: 'Slip midi dress — charcoal',
    description: 'Bias-cut satin, adjustable straps, side slit.',
    priceCents: 5990,
    categorySlug: 'women',
    imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800',
  },
  {
    slug: 'chunky-runner-white',
    name: 'Chunky runner — white',
    description: 'Mesh upper, EVA midsole, rubber outsole. True to size.',
    priceCents: 8990,
    categorySlug: 'shoes',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
    featured: true,
  },
  {
    slug: 'leather-loafer-cognac',
    name: 'Leather loafer — cognac',
    description: 'Full-grain leather upper, leather sole, hand-stitched apron.',
    priceCents: 12990,
    categorySlug: 'shoes',
    imageUrl: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800',
  },
  {
    slug: 'canvas-tote-natural',
    name: 'Canvas tote — natural',
    description: 'Heavyweight 16 oz cotton canvas, reinforced straps, interior pocket.',
    priceCents: 2990,
    categorySlug: 'accessories',
    imageUrl: 'https://images.unsplash.com/photo-1591348278863-a8fb3887e2aa?w=800',
  },
  {
    slug: 'aviator-sunglasses-gold',
    name: 'Aviator sunglasses — gold',
    description: 'Stainless steel frame, polarized lenses, UV400.',
    priceCents: 4490,
    categorySlug: 'accessories',
    imageUrl: 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800',
    featured: true,
  },
  {
    slug: 'utility-jacket-olive',
    name: 'Utility jacket — olive',
    description: 'Water-repellent ripstop, four front pockets, drawcord waist.',
    priceCents: 9990,
    categorySlug: 'new-arrivals',
    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800',
    featured: true,
  },
  {
    slug: 'pleated-mini-skirt-black',
    name: 'Pleated mini skirt — black',
    description: 'Crisp polyester twill, sharp knife pleats, concealed side zip.',
    priceCents: 3990,
    categorySlug: 'new-arrivals',
    imageUrl: 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800',
  },
  {
    slug: 'fleece-hoodie-grey',
    name: 'Fleece hoodie — grey marl',
    description: 'Brushed back fleece, kangaroo pocket, drawstring hood.',
    priceCents: 4490,
    categorySlug: 'men',
    imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800',
  },
  {
    slug: 'tailored-trouser-stone',
    name: 'Tailored trouser — stone',
    description: 'Lightweight wool blend, single pleat, tapered leg.',
    priceCents: 7990,
    categorySlug: 'women',
    imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800',
  },
];

console.log('[seed] starting…');

for (const c of categoriesSeed) {
  const existing = db.select().from(categories).where(eq(categories.slug, c.slug)).get();
  if (!existing) {
    db.insert(categories).values(c).run();
  }
}
console.log(`[seed] ${categoriesSeed.length} categories ready`);

const cats = db.select().from(categories).all();
const bySlug = new Map(cats.map((c) => [c.slug, c.id]));

for (const p of productsSeed) {
  const categoryId = bySlug.get(p.categorySlug);
  if (!categoryId) continue;
  const existing = db.select().from(products).where(eq(products.slug, p.slug)).get();
  if (existing) {
    db.update(products)
      .set({
        name: p.name,
        description: p.description,
        priceCents: p.priceCents,
        imageUrl: p.imageUrl,
        featured: p.featured ?? false,
        categoryId,
      })
      .where(eq(products.slug, p.slug))
      .run();
  } else {
    db.insert(products).values({
      slug: p.slug,
      name: p.name,
      description: p.description,
      priceCents: p.priceCents,
      imageUrl: p.imageUrl,
      featured: p.featured ?? false,
      categoryId,
    }).run();
  }
}
console.log(`[seed] ${productsSeed.length} products ready`);

const adminEmail = 'admin@das-shop.local';
const adminExists = db.select().from(users).where(eq(users.email, adminEmail)).get();
if (!adminExists) {
  const inserted = db
    .insert(users)
    .values({
      email: adminEmail,
      password: bcrypt.hashSync('admin1234', 10),
      name: 'Admin',
      role: 'admin',
    })
    .returning()
    .get();
  db.insert(carts).values({ userId: inserted.id }).run();
  console.log(`[seed] admin user created: ${adminEmail} / admin1234`);
}

console.log('[seed] done');
sqlite.close();
