import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { authRouter } from './routes/auth.js';
import { productsRouter } from './routes/products.js';
import { categoriesRouter } from './routes/categories.js';
import { cartRouter } from './routes/cart.js';
import { ordersRouter } from './routes/orders.js';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:3000';

app.use(
  cors({
    origin: [CORS_ORIGIN, 'http://localhost:3000', 'http://10.0.2.2:3000'],
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'das-shop-api', uptime: process.uptime() });
});

app.use('/auth', authRouter);
app.use('/products', productsRouter);
app.use('/categories', categoriesRouter);
app.use('/cart', cartRouter);
app.use('/orders', ordersRouter);

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api] error:', err);
  res.status(500).json({ error: 'internal_error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`[api] das-shop listening on http://localhost:${PORT}`);
});
