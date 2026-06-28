import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, carts } from '../db/schema.js';
import { signToken, hashPassword, checkPassword } from '../lib/auth.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  }
  const { email, password, name } = parsed.data;

  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    return res.status(409).json({ error: 'email_taken' });
  }

  const inserted = db
    .insert(users)
    .values({ email, password: await hashPassword(password), name })
    .returning()
    .get();
  db.insert(carts).values({ userId: inserted.id }).run();

  const token = signToken({ userId: inserted.id, role: inserted.role });
  res.status(201).json({
    user: { id: inserted.id, email: inserted.email, name: inserted.name, role: inserted.role },
    token,
  });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_input' });
  }
  const { email, password } = parsed.data;

  const user = db.select().from(users).where(eq(users.email, email)).get();
  if (!user || !(await checkPassword(password, user.password))) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  const token = signToken({ userId: user.id, role: user.role });
  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token,
  });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = db.select().from(users).where(eq(users.id, req.user!.userId)).get();
  if (!user) return res.status(404).json({ error: 'not_found' });
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt });
});
