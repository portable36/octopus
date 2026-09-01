'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ProductMediaGallery } from '@/components/storefront/product-media-gallery';
import { ProductOfferPicker } from '@/components/storefront/product-offer-picker';
import { ApiClientError } from '@/lib/api-client';
import {
  fetchPublicProduct,
  formatMoney,
  type PublicProduct,
  type SearchHit,
} from '@/lib/storefront-api';

type Props = {
  readonly hit: SearchHit;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
};

export function ProductQuickView({ hit, open, onOpenChange }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const loaded = await fetchPublicProduct(hit.productId);
        if (!cancelled) {
          setProduct(loaded);
        }
      } catch (err) {
        if (!cancelled) {
          setProduct(null);
          setError(err instanceof ApiClientError ? err.message : 'Could not load product.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, hit.productId]);

  function close() {
    onOpenChange(false);
  }

  return (
    <dialog
      ref={dialogRef}
      className="sf-quick-view-dialog"
      aria-labelledby={`quick-view-title-${hit.id}`}
      onClose={close}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          close();
        }
      }}
    >
      <div className="sf-quick-view-shell">
        <header className="sf-quick-view-header">
          <div className="min-w-0">
            <p className="sf-eyebrow">Quick view</p>
            <h2 id={`quick-view-title-${hit.id}`} className="truncate text-xl font-semibold">
              {hit.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {formatMoney(hit.priceMinor, hit.currencyCode)} · {hit.sku}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={close} aria-label="Close">
            Close
          </Button>
        </header>

        {loading ? (
          <p className="px-6 py-10 text-sm text-muted-foreground">Loading product…</p>
        ) : error ? (
          <div className="space-y-4 px-6 py-10">
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
            <Link
              href={`/products/${hit.productId}`}
              className="text-sm font-semibold underline underline-offset-4"
              onClick={close}
            >
              Open full product page
            </Link>
          </div>
        ) : product ? (
          <div className="sf-quick-view-body">
            <ProductMediaGallery product={product} />
            <div className="space-y-4">
              <p className="line-clamp-4 text-sm text-muted-foreground">
                {(product.description ?? hit.shortDescription) || 'Product details from the store.'}
              </p>
              <ProductOfferPicker
                product={product}
                initialVariantId={hit.variantId}
                preferredOfferId={hit.offerId}
              />
              <Link
                href={`/products/${product.id}`}
                className="inline-flex text-sm font-semibold underline underline-offset-4"
                onClick={close}
              >
                View full details
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
