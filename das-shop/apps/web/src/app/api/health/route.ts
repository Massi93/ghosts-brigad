import { NextResponse } from 'next/server';
import { ensureDbReady } from '@/server/db/init';

export const runtime = 'nodejs';

export async function GET() {
  await ensureDbReady();
  return NextResponse.json({ status: 'ok', service: 'das-shop' });
}
