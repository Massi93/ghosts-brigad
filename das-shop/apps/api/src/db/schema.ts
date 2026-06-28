import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createId } from '../lib/id.js';

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name'),
  role: text('role').notNull().default('customer'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  priceCents: integer('price_cents').notNull(),
  currency: text('currency').notNull().default('EUR'),
  imageUrl: text('image_url').notNull(),
  stock: integer('stock').notNull().default(100),
  featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
});

export const carts = sqliteTable('carts', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const cartItems = sqliteTable(
  'cart_items',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    cartId: text('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    quantity: integer('quantity').notNull().default(1),
    size: text('size'),
  },
  (t) => ({
    uniq: uniqueIndex('cart_items_cart_product_size_idx').on(t.cartId, t.productId, t.size),
  }),
);

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  totalCents: integer('total_cents').notNull(),
  currency: text('currency').notNull().default('EUR'),
  status: text('status').notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s','now'))`),
});

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  orderId: text('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('product_id')
    .notNull()
    .references(() => products.id),
  quantity: integer('quantity').notNull(),
  priceCents: integer('price_cents').notNull(),
  size: text('size'),
});
