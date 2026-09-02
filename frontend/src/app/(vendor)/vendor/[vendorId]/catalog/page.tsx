'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ProductListThumbnail } from '@/components/vendor/catalog/product-list-thumbnail';
import { ApiClientError } from '@/lib/api-client';
import { createDraftVendorProduct, isOfferActive } from '@/lib/vendor-catalog-flow';
import {
  listStoreOffers,
  listVendorProducts,
  type StoreOffer,
  type VendorProduct,
} from '@/lib/vendor-api';
import { getSelectedStoreId, subscribeSelectedStoreId } from '@/lib/vendor-session';

function statusClass(status: string): string {
  switch (status) {
    case 'published':
      return 'text-emerald-700';
    case 'pending_review':
      return 'text-amber-700';
    case 'archived':
      return 'text-muted-foreground';
    default:
      return 'text-foreground';
  }
}

export default function VendorCatalogPage() {
  const router = useRouter();
  const params = useParams<{ vendorId: string }>();
  const vendorId = params.vendorId;
  const [products, setProducts] = useState<VendorProduct[] | null>(null);
  const [storeOffers, setStoreOffers] = useState<StoreOffer[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const offersByProductId = useMemo(() => {
    const map = new Map<string, StoreOffer>();
    for (const offer of storeOffers) {
      map.set(offer.productId, offer);
    }
    return map;
  }, [storeOffers]);

  useEffect(() => {
    const sync = () => setStoreId(getSelectedStoreId());
    sync();
    return subscribeSelectedStoreId(sync);
  }, []);

  const reload = useCallback(async () => {
    const rows = await listVendorProducts(vendorId);
    setProducts(rows);
    const activeStoreId = getSelectedStoreId();
    if (activeStoreId) {
      const offers = await listStoreOffers(activeStoreId).catch(() => [] as StoreOffer[]);
      setStoreOffers(offers);
    } else {
      setStoreOffers([]);
    }
  }, [vendorId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await reload();
        if (!cancelled) {
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load products.');
          setProducts([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  async function onAddProduct() {
    setPending(true);
    setError(null);
    try {
      const product = await createDraftVendorProduct(vendorId);
      router.push(`/vendor/${vendorId}/catalog/${product.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to create product.');
      setPending(false);
    }
  }

  if (products === null && !error) {
    return <p className="text-sm text-muted-foreground">Loading catalog…</p>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Catalog</h2>
          <p className="text-sm text-muted-foreground">
            Create products and manage pricing, media, inventory, and publishing.
          </p>
        </div>
        <Button type="button" disabled={pending} onClick={() => void onAddProduct()}>
          {pending ? 'Creating…' : 'Add product'}
        </Button>
      </header>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {!storeId ? (
        <p className="text-sm text-muted-foreground">
          Select a store in the header to see offer status in the list.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Image</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Variants</th>
              {storeId ? <th className="px-3 py-2 font-medium">Store offer</th> : null}
            </tr>
          </thead>
          <tbody>
            {(products ?? []).length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={storeId ? 6 : 5}>
                  No products yet. Click Add product to start a draft.
                </td>
              </tr>
            ) : (
              (products ?? []).map((product) => {
                const offer = offersByProductId.get(product.id);
                return (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <ProductListThumbnail product={product} />
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        className="font-medium underline-offset-4 hover:underline"
                        href={`/vendor/${vendorId}/catalog/${product.id}`}
                      >
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{product.sku}</td>
                    <td className={`px-3 py-2 capitalize ${statusClass(product.status)}`}>
                      {product.status.replace('_', ' ')}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{product.variantIds.length}</td>
                    {storeId ? (
                      <td className="px-3 py-2">
                        {offer ? (isOfferActive(offer) ? 'Active' : offer.status) : 'None'}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
