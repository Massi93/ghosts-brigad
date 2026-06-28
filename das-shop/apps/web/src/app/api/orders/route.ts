import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { ensureDbReady } from '@/server/db/init';
import { orders, orderItems, products } from '@/server/db/schema';
import { authFromRequest } from '@/server/lib/auth';

export const runtime = 'nodejs';

async function expandOrder(id: string) {
  const order = await db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order) return null;
  const items = await db
    .select({
      id: orderItems.id,
      quantity: orderItems.quantity,
      priceCents: orderItems.priceCents,
      size: orderItems.size,
      product: products,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, id))
    .all();
  return { ...order, items };
}

export async function GET(req: Request) {
  await ensureDbReady();
  const auth = authFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'missing_token' }, { status: 401 });

  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, auth.userId))
    .orderBy(desc(orders.createdAt))
    .all();
  const expanded = await Promise.all(rows.map((o) => expandOrder(o.id)));
  return NextResponse.json(expanded);
}
