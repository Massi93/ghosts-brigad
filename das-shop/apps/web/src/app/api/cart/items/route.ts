import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/server/db';
import { ensureDbReady } from '@/server/db/init';
import { cartItems, products } from '@/server/db/schema';
import { authFromRequest } from '@/server/lib/auth';
import { getOrCreateCart, serializeCart } from '@/server/lib/cart';

export const runtime = 'nodejs';

const schema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1).max(99).default(1),
  size: z.string().optional(),
});

export async function POST(req: Request) {
  await ensureDbReady();
  const auth = authFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'missing_token' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const { productId, quantity, size } = parsed.data;

  const product = await db.select().from(products).where(eq(products.id, productId)).get();
  if (!product) return NextResponse.json({ error: 'product_not_found' }, { status: 404 });

  const cart = await getOrCreateCart(auth.userId);

  const existing = await db
    .select()
    .from(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cart.id),
        eq(cartItems.productId, productId),
        size === undefined ? isNull(cartItems.size) : eq(cartItems.size, size),
      ),
    )
    .get();

  if (existing) {
    await db.update(cartItems)
      .set({ quantity: existing.quantity + quantity })
      .where(eq(cartItems.id, existing.id))
      .run();
  } else {
    await db.insert(cartItems).values({ cartId: cart.id, productId, quantity, size }).run();
  }

  return NextResponse.json(await serializeCart(cart.id));
}
