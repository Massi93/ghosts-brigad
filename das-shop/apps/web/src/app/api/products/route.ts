import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { ensureDbReady } from '@/server/db/init';
import { categories, products } from '@/server/db/schema';

export const runtime = 'nodejs';

const listQuery = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  featured: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: Request) {
  await ensureDbReady();
  const url = new URL(req.url);
  const parsed = listQuery.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_query' }, { status: 400 });
  }
  const { category, search, sort, featured, limit, offset } = parsed.data;

  const conditions = [] as ReturnType<typeof eq>[];
  if (category) {
    const cat = await db.select().from(categories).where(eq(categories.slug, category)).get();
    if (cat) conditions.push(eq(products.categoryId, cat.id));
    else return NextResponse.json({ items: [], total: 0, limit, offset });
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

  const rows = await db
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

  const totalRow = await db
    .select({ c: sql<number>`count(*)` })
    .from(products)
    .where(where)
    .get();

  return NextResponse.json({
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
}
