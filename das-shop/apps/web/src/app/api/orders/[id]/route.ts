import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { ensureDbReady } from '@/server/db/init';
import { orders, orderItems, products } from '@/server/db/schema';
import { authFromRequest } from '@/server/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDbReady();
  const auth = authFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'missing_token' }, { status: 401 });
  const { id } = await params;

  const order = await db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order || order.userId !== auth.userId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

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

  return NextResponse.json({ ...order, items });
}
