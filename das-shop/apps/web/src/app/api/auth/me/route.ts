import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { ensureDbReady } from '@/server/db/init';
import { users } from '@/server/db/schema';
import { authFromRequest } from '@/server/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  await ensureDbReady();
  const auth = authFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'missing_token' }, { status: 401 });

  const user = await db.select().from(users).where(eq(users.id, auth.userId)).get();
  if (!user) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  });
}
