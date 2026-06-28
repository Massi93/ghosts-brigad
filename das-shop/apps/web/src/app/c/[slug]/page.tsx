import Link from 'next/link';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: 'newest' | 'price_asc' | 'price_desc' }>;
}

const SORT_OPTIONS: Array<{ value: 'newest' | 'price_asc' | 'price_desc'; label: string }> = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
];

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { sort = 'newest' } = await searchParams;

  let title = slug;
  let products: Awaited<ReturnType<typeof api.listProducts>>['items'] = [];
  let total = 0;
  try {
    const [cats, list] = await Promise.all([
      api.listCategories(),
      api.listProducts({ category: slug, sort, limit: 48 }),
    ]);
    title = cats.find((c) => c.slug === slug)?.name ?? slug;
    products = list.items;
    total = list.total;
  } catch {
    // empty state
  }

  return (
    <section className="container-page py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-wider2">{title}</h1>
          <p className="mt-1 text-sm text-muted">{total} items</p>
        </div>
        <div className="flex gap-3 text-xs uppercase tracking-wider2">
          {SORT_OPTIONS.map((o) => (
            <Link
              key={o.value}
              href={`/c/${slug}?sort=${o.value}`}
              className={sort === o.value ? 'underline underline-offset-4' : 'text-muted hover:text-ink'}
            >
              {o.label}
            </Link>
          ))}
        </div>
      </div>

      {products.length === 0 ? (
        <p className="py-16 text-center text-muted">No products in this category yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
