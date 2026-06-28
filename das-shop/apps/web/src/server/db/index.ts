import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const url = process.env.DATABASE_URL ?? 'file:./dev.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

declare global {
  // eslint-disable-next-line no-var
  var __dasshop_libsql: Client | undefined;
}

const client: Client =
  global.__dasshop_libsql ??
  createClient({
    url,
    ...(authToken ? { authToken } : {}),
  });

if (process.env.NODE_ENV !== 'production') {
  global.__dasshop_libsql = client;
}

export const db = drizzle(client, { schema });
export { client };
