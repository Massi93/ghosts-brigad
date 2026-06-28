import Image from 'next/image';
import Link from 'next/link';
import { formatPrice, type Product } from '@/lib/api';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/p/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {product.featured && (
          <span className="absolute left-3 top-3 bg-ink px-2 py-1 text-[10px] uppercase tracking-wider2 text-paper">
            Featured
          </span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <h3 className="text-sm">{product.name}</h3>
        <span className="text-sm font-medium">{formatPrice(product.priceCents, product.currency)}</span>
      </div>
    </Link>
  );
}
