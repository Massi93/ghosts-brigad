'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth, useCartStore } from '@/lib/stores';

const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

export function AddToCart({ productId }: { productId: string }) {
  const router = useRouter();
  const { token } = useAuth();
  const { setCart } = useCartStore();
  const [size, setSize] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setError(null);
    if (!token) {
      router.push('/login?next=' + encodeURIComponent(location.pathname));
      return;
    }
    setLoading(true);
    try {
      const cart = await api.addToCart(token, { productId, quantity: 1, size: size ?? undefined });
      setCart(cart);
      router.push('/cart');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8">
      <div className="mb-3 text-xs uppercase tracking-wider2">Size</div>
      <div className="flex flex-wrap gap-2">
        {SIZES.map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className={
              'flex h-11 w-11 items-center justify-center border text-sm transition-colors ' +
              (size === s ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink')
            }
          >
            {s}
          </button>
        ))}
      </div>

      <button
        disabled={loading}
        onClick={handleAdd}
        className="btn btn-primary mt-6 w-full disabled:opacity-50"
      >
        {loading ? 'Adding…' : 'Add to bag'}
      </button>

      {error && <p className="mt-3 text-sm text-accent">{error}</p>}
    </div>
  );
}
