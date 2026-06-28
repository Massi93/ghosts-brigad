'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, Cart } from './api';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clear: () => set({ token: null, user: null }),
    }),
    { name: 'das-shop-auth' },
  ),
);

interface CartState {
  cart: Cart | null;
  setCart: (cart: Cart | null) => void;
}

export const useCartStore = create<CartState>((set) => ({
  cart: null,
  setCart: (cart) => set({ cart }),
}));
