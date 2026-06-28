import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { ensureDbReady } from '@/server/db/init';
import { categories, products } from '@/server/db/schema';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  await ensureDbReady();
  const { slug } = await params;
  const row = await db
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
    .where(eq(products.slug, slug))
    .get();

  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({
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
}
