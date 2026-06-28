import { Router } from 'express';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { cartItems, carts, products } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

export const cartRouter = Router();
cartRouter.use(requireAuth);

function getOrCreateCart(userId: string) {
  const existing = db.select().from(carts).where(eq(carts.userId, userId)).get();
  if (existing) return existing;
  return db.insert(carts).values({ userId }).returning().get();
}

function serializeCart(cartId: string) {
  const rows = db
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

cartRouter.get('/', async (req, res) => {
  const cart = getOrCreateCart(req.user!.userId);
  res.json(serializeCart(cart.id));
});

const addSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1).max(99).default(1),
  size: z.string().optional(),
});

cartRouter.post('/items', async (req, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });
  const { productId, quantity, size } = parsed.data;

  const product = db.select().from(products).where(eq(products.id, productId)).get();
  if (!product) return res.status(404).json({ error: 'product_not_found' });

  const cart = getOrCreateCart(req.user!.userId);

  const existing = db
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
    db.update(cartItems)
      .set({ quantity: existing.quantity + quantity })
      .where(eq(cartItems.id, existing.id))
      .run();
  } else {
    db.insert(cartItems).values({ cartId: cart.id, productId, quantity, size }).run();
  }

  res.json(serializeCart(cart.id));
});

const patchSchema = z.object({ quantity: z.number().int().min(0).max(99) });

cartRouter.patch('/items/:id', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const item = db.select().from(cartItems).where(eq(cartItems.id, req.params.id)).get();
  if (!item) return res.status(404).json({ error: 'not_found' });

  const cart = db.select().from(carts).where(eq(carts.id, item.cartId)).get();
  if (!cart || cart.userId !== req.user!.userId) return res.status(404).json({ error: 'not_found' });

  if (parsed.data.quantity === 0) {
    db.delete(cartItems).where(eq(cartItems.id, item.id)).run();
  } else {
    db.update(cartItems).set({ quantity: parsed.data.quantity }).where(eq(cartItems.id, item.id)).run();
  }

  res.json(serializeCart(cart.id));
});

cartRouter.delete('/items/:id', async (req, res) => {
  const item = db.select().from(cartItems).where(eq(cartItems.id, req.params.id)).get();
  if (!item) return res.status(404).json({ error: 'not_found' });

  const cart = db.select().from(carts).where(eq(carts.id, item.cartId)).get();
  if (!cart || cart.userId !== req.user!.userId) return res.status(404).json({ error: 'not_found' });

  db.delete(cartItems).where(eq(cartItems.id, item.id)).run();
  res.json(serializeCart(cart.id));
});
