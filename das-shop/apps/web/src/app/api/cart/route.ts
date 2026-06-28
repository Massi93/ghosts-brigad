import { NextResponse } from 'next/server';
import { ensureDbReady } from '@/server/db/init';
import { authFromRequest } from '@/server/lib/auth';
import { getOrCreateCart, serializeCart } from '@/server/lib/cart';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  await ensureDbReady();
  const auth = authFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'missing_token' }, { status: 401 });

  const cart = await getOrCreateCart(auth.userId);
  return NextResponse.json(await serializeCart(cart.id));
}
