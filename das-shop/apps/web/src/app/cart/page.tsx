'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, formatPrice } from '@/lib/api';
import { useAuth, useCartStore } from '@/lib/stores';

export default function CartPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { cart, setCart } = useCartStore();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.getCart(token).then(setCart).catch(() => setCart(null));
  }, [token, setCart]);

  if (!token) {
    return (
      <section className="container-page py-24 text-center">
        <h1 className="font-display text-3xl font-black uppercase">Your bag</h1>
        <p className="mt-4 text-muted">Log in to see your bag.</p>
        <Link href="/login?next=/cart" className="btn btn-primary mt-6">
          Log in
        </Link>
      </section>
    );
  }

  if (!cart) {
    return <section className="container-page py-24 text-center text-muted">Loading…</section>;
  }

  if (cart.items.length === 0) {
    return (
      <section className="container-page py-24 text-center">
        <h1 className="font-display text-3xl font-black uppercase">Your bag is empty</h1>
        <Link href="/" className="btn btn-primary mt-6">
          Start shopping
        </Link>
      </section>
    );
  }

  async function update(id: string, quantity: number) {
    if (!token) return;
    setBusy(true);
    try {
      setCart(await api.updateCartItem(token, id, quantity));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!token) return;
    setBusy(true);
    try {
      setCart(await api.removeCartItem(token, id));
    } finally {
      setBusy(false);
    }
  }

  async function checkout() {
    if (!token) return;
    setBusy(true);
    try {
      await api.checkout(token);
      setCart(await api.getCart(token));
      router.push('/orders');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="container-page grid gap-10 py-10 lg:grid-cols-[2fr_1fr]">
      <div>
        <h1 className="font-display text-3xl font-black uppercase">Your bag</h1>
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {cart.items.map((item) => (
            <li key={item.id} className="flex gap-4 py-6">
              <div className="relative h-32 w-24 shrink-0 overflow-hidden bg-neutral-100">
                <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <div className="flex justify-between gap-4">
                    <h3 className="text-sm">{item.product.name}</h3>
                    <span className="text-sm font-medium">
                      {formatPrice(item.product.priceCents * item.quantity, item.product.currency)}
                    </span>
                  </div>
                  {item.size && <p className="mt-1 text-xs uppercase tracking-wider2 text-muted">Size {item.size}</p>}
                </div>
                <div className="flex items-end justify-between">
                  <div className="flex items-center border border-line">
                    <button
                      className="h-8 w-8 disabled:opacity-30"
                      disabled={busy}
                      onClick={() => update(item.id, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      className="h-8 w-8 disabled:opacity-30"
                      disabled={busy}
                      onClick={() => update(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => remove(item.id)}
                    disabled={busy}
                    className="text-xs uppercase tracking-wider2 text-muted hover:text-ink"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="border border-line p-6">
          <h2 className="font-display text-lg font-black uppercase tracking-wider2">Summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal ({cart.itemCount})</span>
              <span>{formatPrice(cart.subtotalCents, cart.currency)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Shipping</span>
              <span>Calculated at next step</span>
            </div>
          </div>
          <div className="mt-4 flex justify-between border-t border-line pt-4 text-base font-medium">
            <span>Total</span>
            <span>{formatPrice(cart.subtotalCents, cart.currency)}</span>
          </div>
          <button disabled={busy} onClick={checkout} className="btn btn-primary mt-6 w-full disabled:opacity-50">
            Checkout
          </button>
        </div>
      </aside>
    </section>
  );
}
