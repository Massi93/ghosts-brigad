import Image from 'next/image';
import { notFound } from 'next/navigation';
import { api, formatPrice } from '@/lib/api';
import { AddToCart } from './AddToCart';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  let product;
  try {
    product = await api.getProduct(slug);
  } catch {
    notFound();
  }

  return (
    <section className="container-page grid gap-8 py-10 lg:grid-cols-2">
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="text-xs uppercase tracking-wider2 text-muted">{product.category?.name}</p>
        <h1 className="mt-2 font-display text-3xl font-black uppercase leading-tight">{product.name}</h1>
        <p className="mt-3 text-xl">{formatPrice(product.priceCents, product.currency)}</p>

        <p className="mt-8 max-w-prose text-sm leading-relaxed text-muted">{product.description}</p>

        <AddToCart productId={product.id} />

        <div className="mt-10 space-y-4 border-t border-line pt-6 text-xs uppercase tracking-wider2 text-muted">
          <div>Free shipping over 50&nbsp;€</div>
          <div>30-day returns</div>
          <div>{product.stock > 0 ? 'In stock' : 'Out of stock'}</div>
        </div>
      </div>
    </section>
  );
}
