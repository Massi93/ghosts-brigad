import { eq } from 'drizzle-orm';
import { db } from '../db';
import { carts, cartItems, products } from '../db/schema';

export async function getOrCreateCart(userId: string) {
  const existing = await db.select().from(carts).where(eq(carts.userId, userId)).get();
  if (existing) return existing;
  return db.insert(carts).values({ userId }).returning().get();
}

export async function serializeCart(cartId: string) {
  const rows = await db
    .select({
      itemId: cartItems.id,
      quantity: cartItems.quantity,
      size: cartItems.size,
      product: products,
    })
    .from(cartItems)
    .leftJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.cartId, cartId))
    .all();

  const items = rows
    .filter((r) => r.product !== null)
    .map((r) => ({ id: r.itemId, quantity: r.quantity, size: r.size, product: r.product! }));

  const subtotalCents = items.reduce((sum, i) => sum + i.product.priceCents * i.quantity, 0);
  return {
    id: cartId,
    items,
    subtotalCents,
    currency: items[0]?.product.currency ?? 'EUR',
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
  };
}
