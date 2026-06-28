import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db, sqlite } from '../db/index.js';
import { carts, cartItems, orders, orderItems, products } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

function expandOrder(id: string) {
  const order = db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order) return null;
  const items = db
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

ordersRouter.get('/', async (req, res) => {
  const rows = db
    .select()
    .from(orders)
    .where(eq(orders.userId, req.user!.userId))
    .orderBy(desc(orders.createdAt))
    .all();
  res.json(rows.map((o) => expandOrder(o.id)));
});

ordersRouter.post('/checkout', async (req, res) => {
  const cart = db.select().from(carts).where(eq(carts.userId, req.user!.userId)).get();
  if (!cart) return res.status(400).json({ error: 'empty_cart' });

  const items = db
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
  if (valid.length === 0) return res.status(400).json({ error: 'empty_cart' });

  const totalCents = valid.reduce((sum, i) => sum + i.product!.priceCents * i.quantity, 0);
  const currency = valid[0].product!.currency;

  const tx = sqlite.transaction(() => {
    const order = db
      .insert(orders)
      .values({ userId: req.user!.userId, totalCents, currency, status: 'pending' })
      .returning()
      .get();

    for (const i of valid) {
      db.insert(orderItems).values({
        orderId: order.id,
        productId: i.product!.id,
        quantity: i.quantity,
        priceCents: i.product!.priceCents,
        size: i.size,
      }).run();
    }

    db.delete(cartItems).where(eq(cartItems.cartId, cart.id)).run();
    return order;
  });

  const order = tx();
  res.status(201).json(expandOrder(order.id));
});

ordersRouter.get('/:id', async (req, res) => {
  const order = expandOrder(req.params.id);
  if (!order || order.userId !== req.user!.userId) {
    return res.status(404).json({ error: 'not_found' });
  }
  res.json(order);
});
