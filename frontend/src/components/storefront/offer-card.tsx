'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ProductQuickView } from '@/components/storefront/product-quick-view';
import { formatMoney, type SearchHit } from '@/lib/storefront-api';

export function OfferCard({ hit }: { readonly hit: SearchHit }) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const initial = hit.name.trim().charAt(0).toUpperCase() || 'O';

  return (
    <article className="sf-offer-card">
      <Link href={`/products/${hit.productId}`} aria-label={`View ${hit.name}`}>
        <div className="sf-offer-stage relative overflow-hidden p-0" aria-hidden="true">
          {hit.primaryImageUrl ? (
            <Image
              src={hit.primaryImageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-3xl font-semibold text-muted-foreground">
              {initial}
            </span>
          )}
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setQuickViewOpen(true)}
        >
          Quick view
        </Button>
      </div>
      <ProductQuickView hit={hit} open={quickViewOpen} onOpenChange={setQuickViewOpen} />
    </article>
  );
}
