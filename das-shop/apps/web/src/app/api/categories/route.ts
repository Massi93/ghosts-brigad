import { NextResponse } from 'next/server';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { ensureDbReady } from '@/server/db/init';
import { categories, products } from '@/server/db/schema';

export const runtime = 'nodejs';

export async function GET() {
  await ensureDbReady();
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      productCount: sql<number>`count(${products.id})`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name))
    .all();

  return NextResponse.json(rows);
}
