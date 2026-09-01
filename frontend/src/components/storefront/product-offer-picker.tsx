'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AddToCartButton } from '@/components/storefront/add-to-cart-button';
import { formatMoney, type PublicProduct } from '@/lib/storefront-api';

type Props = {
  readonly product: PublicProduct;
  readonly initialVariantId?: string | null;
  readonly preferredOfferId?: string | null;
};

export function ProductOfferPicker({ product, initialVariantId, preferredOfferId }: Props) {
  const variantsById = useMemo(
    () => new Map(product.variants.map((variant) => [variant.id, variant])),
    [product.variants],
  );
  const defaultVariantId = initialVariantId ?? product.variants[0]?.id ?? null;
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(defaultVariantId);

  useEffect(() => {
    setSelectedVariantId(initialVariantId ?? product.variants[0]?.id ?? null);
  }, [product.id, initialVariantId, product.variants]);

  const visibleOffers = useMemo(() => {
    if (!selectedVariantId) {
      return product.offers;
    }
    return product.offers.filter((offer) => offer.variantId === selectedVariantId);
  }, [product.offers, selectedVariantId]);

  if (product.offers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No active store offers for this product.</p>
    );
  }

  return (
    <div className="space-y-4">
      {product.variants.length > 1 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Choose a variant</legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => {
              const selected = variant.id === selectedVariantId;
              return (
                <button
                  key={variant.id}
                  type="button"
                  className={
                    selected
                      ? 'rounded-md border border-foreground bg-foreground px-3 py-2 text-sm text-background'
                      : 'rounded-md border border-border bg-background px-3 py-2 text-sm'
                  }
                  aria-pressed={selected}
                  onClick={() => setSelectedVariantId(variant.id)}
                >
                  {variant.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <ul className="sf-offer-list">
        {visibleOffers.map((offer) => {
          const variant = variantsById.get(offer.variantId);
          const highlighted = offer.id === preferredOfferId;
          return (
            <li
              key={offer.id}
              className={highlighted ? 'sf-offer-row sf-offer-row-highlight' : 'sf-offer-row'}
            >
              <div>
                <p className="font-semibold text-foreground">{variant?.name ?? offer.variantId}</p>
                <p>
                  SKU {variant?.sku ?? '—'} ·{' '}
                  <Link
                    href={`/search?storeId=${encodeURIComponent(offer.storeId)}`}
                    className="underline underline-offset-4"
                  >
                    View store
                  </Link>
                </p>
                <p className={offer.isAvailable ? 'sf-stock-ok' : 'sf-stock-out'}>
                  {offer.isAvailable ? 'Available now' : 'Currently unavailable'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <p className="sf-price tabular-nums">
                  {formatMoney(offer.priceMinor, offer.currencyCode)}
                </p>
                <AddToCartButton
                  storeId={offer.storeId}
                  variantId={offer.variantId}
                  disabled={!offer.isAvailable}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
