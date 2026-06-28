'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/stores';

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') ?? '/';
  const { setAuth } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result =
        mode === 'login'
          ? await api.login({ email, password })
          : await api.register({ email, password, name: name || undefined });
      setAuth(result.token, result.user);
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-3xl font-black uppercase">
        {mode === 'login' ? 'Log in' : 'Create account'}
      </h1>

      <form onSubmit={submit} className="mt-8 space-y-4">
        {mode === 'register' && (
          <div>
            <label className="text-xs uppercase tracking-wider2">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border border-line bg-transparent px-3 py-2 outline-none focus:border-ink"
            />
          </div>
        )}
        <div>
          <label className="text-xs uppercase tracking-wider2">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-line bg-transparent px-3 py-2 outline-none focus:border-ink"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider2">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-line bg-transparent px-3 py-2 outline-none focus:border-ink"
          />
        </div>

        {error && <p className="text-sm text-accent">{error}</p>}

        <button type="submit" disabled={loading} className="btn btn-primary w-full disabled:opacity-50">
          {loading ? '…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        className="mt-6 w-full text-center text-xs uppercase tracking-wider2 text-muted hover:text-ink"
      >
        {mode === 'login' ? 'No account? Create one' : 'Already have an account? Log in'}
      </button>

      <p className="mt-8 text-center text-xs text-muted">
        Demo admin:{' '}
        <Link href="#" onClick={(e) => { e.preventDefault(); setEmail('admin@das-shop.local'); setPassword('admin1234'); }} className="underline">
          fill credentials
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <section className="container-page flex justify-center py-16">
      <Suspense fallback={<div className="text-muted">Loading…</div>}>
        <LoginInner />
      </Suspense>
    </section>
  );
}
