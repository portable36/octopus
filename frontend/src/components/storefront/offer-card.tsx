import Link from 'next/link';
import { formatMoney, type SearchHit } from '@/lib/storefront-api';

export function OfferCard({ hit }: { readonly hit: SearchHit }) {
  return (
    <article className="sf-offer-card">
      <Link href={`/products/${hit.productId}`} aria-label={`View ${hit.name}`}>
        <div className="sf-offer-stage" aria-hidden="true">
          {hit.name.trim().charAt(0).toUpperCase() || 'O'}
        </div>
      </Link>
      <div className="sf-offer-meta">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate">
              <Link href={`/products/${hit.productId}`} className="hover:underline">
                {hit.name}
              </Link>
            </h2>
            <p className="truncate">{hit.shortDescription || hit.sku}</p>
          </div>
          <p className="sf-price shrink-0 tabular-nums">
            {formatMoney(hit.priceMinor, hit.currencyCode)}
          </p>
        </div>
        <p className={hit.stockStatus === 'IN_STOCK' ? 'sf-stock-ok' : 'sf-stock-out'}>
          {hit.stockStatus === 'IN_STOCK'
            ? 'In stock'
            : hit.stockStatus === 'OUT_OF_STOCK'
              ? 'Out of stock'
              : 'Availability unknown'}
        </p>
      </div>
    </article>
  );
}
