function resolveBaseUrl(): string {
  if (typeof window !== 'undefined') return '';
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  productCount?: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  imageUrl: string;
  stock: number;
  featured: boolean;
  category?: Category;
  categoryId: string;
}

export interface ProductList {
  items: Product[];
  total: number;
  limit: number;
  offset: number;
}

export interface CartItem {
  id: string;
  quantity: number;
  size: string | null;
  product: Product;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotalCents: number;
  currency: string;
  itemCount: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

type ListParams = {
  category?: string;
  search?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  featured?: boolean;
  limit?: number;
  offset?: number;
};

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  const res = await fetch(`${resolveBaseUrl()}${path}`, { ...init, headers, cache: 'no-store' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `request_failed_${res.status}`);
  }
  return res.json();
}

export const api = {
  async listProducts(params: ListParams = {}): Promise<ProductList> {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    });
    return request<ProductList>(`/api/products?${q.toString()}`);
  },
  getProduct: (slug: string) => request<Product>(`/api/products/${slug}`),
  listCategories: () => request<Category[]>('/api/categories'),
  register: (data: { email: string; password: string; name?: string }) =>
    request<{ user: AuthUser; token: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<{ user: AuthUser; token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: (token: string) => request<AuthUser>('/api/auth/me', {}, token),
  getCart: (token: string) => request<Cart>('/api/cart', {}, token),
  addToCart: (token: string, data: { productId: string; quantity?: number; size?: string }) =>
    request<Cart>('/api/cart/items', { method: 'POST', body: JSON.stringify(data) }, token),
  updateCartItem: (token: string, id: string, quantity: number) =>
    request<Cart>(`/api/cart/items/${id}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }, token),
  removeCartItem: (token: string, id: string) =>
    request<Cart>(`/api/cart/items/${id}`, { method: 'DELETE' }, token),
  checkout: (token: string) => request<unknown>('/api/orders/checkout', { method: 'POST' }, token),
};

export function formatPrice(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100);
}
