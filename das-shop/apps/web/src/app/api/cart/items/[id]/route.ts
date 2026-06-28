import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { ensureDbReady } from '@/server/db/init';
import { carts, cartItems } from '@/server/db/schema';
import { authFromRequest } from '@/server/lib/auth';
import { serializeCart } from '@/server/lib/cart';

export const runtime = 'nodejs';

const patchSchema = z.object({ quantity: z.number().int().min(0).max(99) });

async function loadItem(id: string, userId: string) {
  const item = await db.select().from(cartItems).where(eq(cartItems.id, id)).get();
  if (!item) return null;
  const cart = await db.select().from(carts).where(eq(carts.id, item.cartId)).get();
  if (!cart || cart.userId !== userId) return null;
  return { item, cart };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDbReady();
  const auth = authFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'missing_token' }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const loaded = await loadItem(id, auth.userId);
  if (!loaded) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (parsed.data.quantity === 0) {
    await db.delete(cartItems).where(eq(cartItems.id, id)).run();
  } else {
    await db.update(cartItems).set({ quantity: parsed.data.quantity }).where(eq(cartItems.id, id)).run();
  }

  return NextResponse.json(await serializeCart(loaded.cart.id));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDbReady();
  const auth = authFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'missing_token' }, { status: 401 });
  const { id } = await params;

  const loaded = await loadItem(id, auth.userId);
  if (!loaded) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await db.delete(cartItems).where(eq(cartItems.id, id)).run();
  return NextResponse.json(await serializeCart(loaded.cart.id));
}
