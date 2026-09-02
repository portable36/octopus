'use client';

import { useEffect, useRef } from 'react';
import { pushToDataLayer } from '@/infrastructure/analytics/dataLayer';
import { itemFromProductOffer } from '@/infrastructure/analytics/ecommerce-mappers';
import type { PublicProduct } from '@/lib/storefront-api';

type Props = {
  readonly product: PublicProduct;
  readonly itemListName?: string;
  readonly itemCategory?: string;
};

/** Fires GA4 `view_item` once per product mount when analytics consent is granted. */
export function ProductViewAnalytics({ product, itemListName, itemCategory }: Props) {
  const trackedProductId = useRef<string | null>(null);

  useEffect(() => {
    if (trackedProductId.current === product.id) {
      return;
    }

    const item = itemFromProductOffer(product, undefined, undefined, 1, {
      itemListName,
      itemCategory,
    });
    if (!item) {
      return;
    }

    trackedProductId.current = product.id;
    pushToDataLayer({
      event: 'view_item',
      currency: product.offers[0]?.currencyCode ?? 'BDT',
      value: item.price,
      items: [item],
      ...(itemListName ? { itemListName } : {}),
      ...(itemCategory || item.category ? { itemCategory: itemCategory ?? item.category } : {}),
    });
  }, [product, itemListName, itemCategory]);

  return null;
}
