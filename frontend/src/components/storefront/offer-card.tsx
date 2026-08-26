import Link from 'next/link';
import { formatMoney, type SearchHit } from '@/lib/storefront-api';

export function OfferCard({ hit }: { readonly hit: SearchHit }) {
  return (
    <article className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0 sm:border sm:border-border sm:p-4 sm:last:border-b">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-medium leading-snug">
            <Link
              href={`/products/${hit.productId}`}
              className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {hit.name}
            </Link>
          </h2>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {hit.shortDescription || hit.sku}
          </p>
        </div>
        <p className="shrink-0 text-sm font-medium tabular-nums">
          {formatMoney(hit.priceMinor, hit.currencyCode)}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        {hit.stockStatus === 'IN_STOCK'
          ? 'In stock'
          : hit.stockStatus === 'OUT_OF_STOCK'
            ? 'Out of stock'
            : 'Availability unknown'}
      </p>
    </article>
  );
}
