import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { ensureDbReady } from '@/server/db/init';
import { users, carts } from '@/server/db/schema';
import { hashPassword, signToken } from '@/server/lib/auth';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  await ensureDbReady();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  }
  const { email, password, name } = parsed.data;

  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return NextResponse.json({ error: 'email_taken' }, { status: 409 });

  const user = await db
    .insert(users)
    .values({ email, password: await hashPassword(password), name })
    .returning()
    .get();
  await db.insert(carts).values({ userId: user.id }).run();

  const token = signToken({ userId: user.id, role: user.role });
  return NextResponse.json(
    { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token },
    { status: 201 },
  );
}
