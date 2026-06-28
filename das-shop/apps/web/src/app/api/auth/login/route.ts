import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { ensureDbReady } from '@/server/db/init';
import { users } from '@/server/db/schema';
import { checkPassword, signToken } from '@/server/lib/auth';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  await ensureDbReady();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await db.select().from(users).where(eq(users.email, email)).get();
  if (!user || !(await checkPassword(password, user.password))) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  const token = signToken({ userId: user.id, role: user.role });
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token,
  });
}
