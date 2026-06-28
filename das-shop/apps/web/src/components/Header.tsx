'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth, useCartStore } from '@/lib/stores';
import { api } from '@/lib/api';

const NAV = [
  { slug: 'women', label: 'Women' },
  { slug: 'men', label: 'Men' },
  { slug: 'shoes', label: 'Shoes' },
  { slug: 'accessories', label: 'Accessories' },
  { slug: 'new-arrivals', label: 'New' },
];

export function Header() {
  const { user, token, clear } = useAuth();
  const { cart, setCart } = useCartStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      setCart(null);
      return;
    }
    api.getCart(token).then(setCart).catch(() => setCart(null));
  }, [token, setCart]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="lg:hidden"
          aria-label="Menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>

        <Link href="/" className="font-display text-xl font-black tracking-wider2">
          das-shop
        </Link>

        <nav className="hidden gap-8 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.slug}
              href={`/c/${n.slug}`}
              className="text-xs uppercase tracking-wider2 hover:text-accent"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/search" aria-label="Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </Link>

          {user ? (
            <button
              onClick={clear}
              className="hidden text-xs uppercase tracking-wider2 sm:inline"
              title={user.email}
            >
              Log out
            </button>
          ) : (
            <Link href="/login" className="hidden text-xs uppercase tracking-wider2 sm:inline">
              Log in
            </Link>
          )}

          <Link href="/cart" className="relative" aria-label="Cart">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 7h12l-1.5 11.5a2 2 0 01-2 1.5h-5a2 2 0 01-2-1.5L6 7z" />
              <path d="M9 7V5a3 3 0 016 0v2" />
            </svg>
            {cart && cart.itemCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-paper">
                {cart.itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-line bg-paper lg:hidden">
          <div className="container-page flex flex-col py-4">
            {NAV.map((n) => (
              <Link
                key={n.slug}
                href={`/c/${n.slug}`}
                onClick={() => setMobileOpen(false)}
                className="py-3 text-sm uppercase tracking-wider2"
              >
                {n.label}
              </Link>
            ))}
            {!user && (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="py-3 text-sm uppercase tracking-wider2">
                Log in
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
