import { Router } from 'express';
import { z } from 'zod';
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { categories, products } from '../db/schema.js';

export const productsRouter = Router();

const listQuery = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  featured: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  offset: z.coerce.number().int().min(0).default(0),
});

productsRouter.get('/', async (req, res) => {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_query' });
  const { category, search, sort, featured, limit, offset } = parsed.data;

  const conditions = [] as ReturnType<typeof eq>[];
  if (category) {
    const cat = db.select().from(categories).where(eq(categories.slug, category)).get();
    if (cat) conditions.push(eq(products.categoryId, cat.id));
    else return res.json({ items: [], total: 0, limit, offset });
  }
  if (featured !== undefined) conditions.push(eq(products.featured, featured));
  if (search) {
    const pat = `%${search}%`;
    conditions.push(or(like(products.name, pat), like(products.description, pat))!);
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const orderBy =
    sort === 'price_asc'
      ? asc(products.priceCents)
      : sort === 'price_desc'
        ? desc(products.priceCents)
        : desc(products.createdAt);

  const rows = db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      description: products.description,
      priceCents: products.priceCents,
      currency: products.currency,
      imageUrl: products.imageUrl,
      stock: products.stock,
      featured: products.featured,
      categoryId: products.categoryId,
      categorySlug: categories.slug,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset)
    .all();

  const totalRow = db
    .select({ c: sql<number>`count(*)` })
    .from(products)
    .where(where)
    .get();

  res.json({
    items: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      priceCents: r.priceCents,
      currency: r.currency,
      imageUrl: r.imageUrl,
      stock: r.stock,
      featured: r.featured,
      categoryId: r.categoryId,
      category: r.categorySlug ? { id: r.categoryId, slug: r.categorySlug, name: r.categoryName! } : null,
    })),
    total: totalRow?.c ?? 0,
    limit,
    offset,
  });
});

productsRouter.get('/:slug', async (req, res) => {
  const row = db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      description: products.description,
      priceCents: products.priceCents,
      currency: products.currency,
      imageUrl: products.imageUrl,
      stock: products.stock,
      featured: products.featured,
      categoryId: products.categoryId,
      categorySlug: categories.slug,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, req.params.slug))
    .get();

  if (!row) return res.status(404).json({ error: 'not_found' });

  res.json({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceCents: row.priceCents,
    currency: row.currency,
    imageUrl: row.imageUrl,
    stock: row.stock,
    featured: row.featured,
    categoryId: row.categoryId,
    category: row.categorySlug ? { id: row.categoryId, slug: row.categorySlug, name: row.categoryName! } : null,
  });
});
