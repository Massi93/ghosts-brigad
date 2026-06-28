import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { ensureDbReady } from '@/server/db/init';
import { carts, cartItems, orders, orderItems, products } from '@/server/db/schema';
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

export async function POST(req: Request) {
  await ensureDbReady();
  const auth = authFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'missing_token' }, { status: 401 });

  const cart = await db.select().from(carts).where(eq(carts.userId, auth.userId)).get();
  if (!cart) return NextResponse.json({ error: 'empty_cart' }, { status: 400 });

  const items = await db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      size: cartItems.size,
      product: products,
    })
    .from(cartItems)
    .leftJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.cartId, cart.id))
    .all();

  const valid = items.filter((i) => i.product !== null);
  if (valid.length === 0) return NextResponse.json({ error: 'empty_cart' }, { status: 400 });

  const totalCents = valid.reduce((sum, i) => sum + i.product!.priceCents * i.quantity, 0);
  const currency = valid[0].product!.currency;

  const order = await db
    .insert(orders)
    .values({ userId: auth.userId, totalCents, currency, status: 'pending' })
    .returning()
    .get();

  for (const i of valid) {
    await db.insert(orderItems).values({
      orderId: order.id,
      productId: i.product!.id,
      quantity: i.quantity,
      priceCents: i.product!.priceCents,
      size: i.size,
    }).run();
  }

  await db.delete(cartItems).where(eq(cartItems.cartId, cart.id)).run();
  return NextResponse.json(await expandOrder(order.id), { status: 201 });
}
