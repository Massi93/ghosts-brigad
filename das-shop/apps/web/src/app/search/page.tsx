import { api } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = '' } = await searchParams;
  let items: Awaited<ReturnType<typeof api.listProducts>>['items'] = [];
  let total = 0;
  if (q) {
    try {
      const list = await api.listProducts({ search: q, limit: 48 });
      items = list.items;
      total = list.total;
    } catch {
      // empty
    }
  }

  return (
    <section className="container-page py-10">
      <form className="mb-8 flex gap-3 border-b border-line pb-4">
        <input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="Search products…"
          className="w-full bg-transparent text-lg outline-none"
        />
        <button className="text-xs uppercase tracking-wider2">Search</button>
      </form>

      {q ? (
        <>
          <p className="mb-6 text-sm text-muted">
            {total} result{total !== 1 ? 's' : ''} for &quot;{q}&quot;
          </p>
          {items.length === 0 ? (
            <p className="py-12 text-center text-muted">No matches.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-muted">Type something to start searching.</p>
      )}
    </section>
  );
}
