'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/api';
import { useAuth } from '@/lib/stores';

interface Order {
  id: string;
  totalCents: number;
  currency: string;
  status: string;
  createdAt: string;
  items: { id: string; quantity: number; product: { name: string; imageUrl: string } }[];
}

export default function OrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders`, {
      headers: { authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [token]);

  if (!token) {
    return (
      <section className="container-page py-24 text-center">
        <h1 className="font-display text-3xl font-black uppercase">Orders</h1>
        <Link href="/login?next=/orders" className="btn btn-primary mt-6">Log in</Link>
      </section>
    );
  }

  if (orders === null) {
    return <section className="container-page py-24 text-center text-muted">Loading…</section>;
  }

  return (
    <section className="container-page py-10">
      <h1 className="font-display text-3xl font-black uppercase">Orders</h1>
      {orders.length === 0 ? (
        <p className="mt-8 text-muted">No orders yet.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="border border-line p-6">
              <div className="flex justify-between text-sm">
                <div>
                  <div className="font-medium">#{o.id.slice(0, 8)}</div>
                  <div className="text-muted">{new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div>{formatPrice(o.totalCents, o.currency)}</div>
                  <div className="text-xs uppercase tracking-wider2 text-muted">{o.status}</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-muted">
                {o.items.length} item{o.items.length > 1 ? 's' : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
