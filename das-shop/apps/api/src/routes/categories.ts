import { Router } from 'express';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { categories, products } from '../db/schema.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (_req, res) => {
  const rows = db
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

  res.json(rows);
});
