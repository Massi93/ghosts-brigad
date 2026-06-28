import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let featured: Awaited<ReturnType<typeof api.listProducts>>['items'] = [];
  let categories: Awaited<ReturnType<typeof api.listCategories>> = [];
  try {
    const [f, c] = await Promise.all([
      api.listProducts({ featured: true, limit: 8 }),
      api.listCategories(),
    ]);
    featured = f.items;
    categories = c;
  } catch {
    // API down — render an empty state instead of crashing.
  }

  return (
    <>
      <section className="relative h-[70vh] min-h-[480px] overflow-hidden bg-neutral-200">
        <Image
          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=2000"
          alt=""
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="container-page relative flex h-full flex-col items-start justify-end pb-16 text-paper">
          <h1 className="font-display text-5xl font-black uppercase leading-none tracking-tighter sm:text-7xl lg:text-8xl">
            Summer drop
          </h1>
          <p className="mt-4 max-w-md text-sm sm:text-base">
            Considered pieces, made to last. New arrivals every week.
          </p>
          <Link href="/c/new-arrivals" className="btn btn-outline mt-6 border-paper text-paper hover:bg-paper hover:text-ink">
            Shop new in
          </Link>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="container-page py-16">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-display text-2xl font-black uppercase tracking-wider2">Shop by category</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/c/${c.slug}`}
                className="group flex aspect-square items-center justify-center border border-line bg-paper text-sm uppercase tracking-wider2 transition-colors hover:bg-ink hover:text-paper"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="container-page py-16">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-display text-2xl font-black uppercase tracking-wider2">Featured</h2>
            <Link href="/c/new-arrivals" className="text-xs uppercase tracking-wider2 underline-offset-4 hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {featured.length === 0 && categories.length === 0 && (
        <section className="container-page py-24 text-center">
          <p className="text-muted">
            Catalog not available yet. Start the API and run the seed:{' '}
            <code className="rounded bg-neutral-100 px-2 py-1 text-sm">npm run db:setup</code>
          </p>
        </section>
      )}
    </>
  );
}
