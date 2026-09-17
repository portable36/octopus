'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { isOfferActive } from '@/lib/vendor-catalog-flow';
import {
  activateStoreOffer,
  formatVendorMoney,
  getVendorStore,
  listStoreOffers,
  listVendorProducts,
  suspendStoreOffer,
  type StoreOffer,
  type StoreSummary,
  type VendorProduct,
} from '@/lib/vendor-api';
import { setSelectedStoreId } from '@/lib/vendor-session';

export default function VendorStoreCatalogPage() {
  const params = useParams<{ vendorId: string; storeId: string }>();
  const { vendorId, storeId } = params;
  const [store, setStore] = useState<StoreSummary | null>(null);
  const [offers, setOffers] = useState<StoreOffer[] | null>(null);
  const [productsById, setProductsById] = useState<Map<string, VendorProduct>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const reload = useCallback(async () => {
    const [storeRow, offerRows, products] = await Promise.all([
      getVendorStore(storeId),
      listStoreOffers(storeId),
      listVendorProducts(vendorId),
    ]);
    setStore(storeRow);
    setOffers(offerRows);
    setProductsById(new Map(products.map((product) => [product.id, product])));
    setSelectedStoreId(storeId);
  }, [storeId, vendorId]);

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
          setError(err instanceof ApiClientError ? err.message : 'Failed to load store catalog.');
          setOffers([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const counts = useMemo(() => {
    const rows = offers ?? [];
    return {
      total: rows.length,
      active: rows.filter((row) => isOfferActive(row)).length,
      inactive: rows.filter((row) => !isOfferActive(row)).length,
    };
  }, [offers]);

  const visible = useMemo(() => {
    const rows = offers ?? [];
    if (filter === 'active') {
      return rows.filter((row) => isOfferActive(row));
    }
    if (filter === 'inactive') {
      return rows.filter((row) => !isOfferActive(row));
    }
    return rows;
  }, [offers, filter]);

  async function onToggle(offer: StoreOffer) {
    if (pendingId) {
      return;
    }
    setPendingId(offer.id);
    setError(null);
    setMessage(null);
    try {
      const updated = isOfferActive(offer)
        ? await suspendStoreOffer(offer.id)
        : await activateStoreOffer(offer.id);
      setOffers((prev) => (prev ?? []).map((row) => (row.id === updated.id ? updated : row)));
      setMessage(isOfferActive(updated) ? 'Offer activated.' : 'Offer suspended.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not update offer.');
    } finally {
      setPendingId(null);
    }
  }

  if (offers === null && !error) {
    return <p className="text-sm text-muted-foreground">Loading store catalog…</p>;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          href={`/vendor/${vendorId}/stores/${storeId}`}
        >
          ← {store?.profile.displayName ?? 'Store'}
        </Link>
        <h2 className="text-xl font-semibold tracking-tight">Store catalog</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Offers published to this store. Create products in the vendor catalog, then set store
          price and activate the offer for this location.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>
          Total <strong className="tabular-nums">{counts.total}</strong>
        </span>
        <span>
          Active <strong className="tabular-nums">{counts.active}</strong>
        </span>
        <span>
          Inactive <strong className="tabular-nums">{counts.inactive}</strong>
        </span>
        <label className="ml-auto flex items-center gap-2">
          <span className="text-muted-foreground">Show</span>
          <select
            className="h-9 rounded-md border border-border bg-background px-2"
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
          >
            <option value="all">All offers</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </label>
        <Link
          href={`/vendor/${vendorId}/catalog`}
          className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-sm hover:bg-muted"
        >
          Vendor catalog
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">Variant</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Available</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                  No offers for this store yet. Open a product in the vendor catalog and set pricing
                  for the selected store.
                </td>
              </tr>
            ) : (
              visible.map((offer) => {
                const product = productsById.get(offer.productId);
                return (
                  <tr key={offer.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <Link
                        className="font-medium underline-offset-4 hover:underline"
                        href={`/vendor/${vendorId}/catalog/${offer.productId}`}
                      >
                        {product?.name ?? offer.productId.slice(0, 8)}
                      </Link>
                      {product ? (
                        <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{offer.variantId.slice(0, 8)}…</td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatVendorMoney(offer.priceMinor, offer.currencyCode)}
                    </td>
                    <td className="px-3 py-2 capitalize">{offer.status}</td>
                    <td className="px-3 py-2">{offer.isAvailable ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pendingId === offer.id}
                        onClick={() => void onToggle(offer)}
                      >
                        {pendingId === offer.id
                          ? 'Saving…'
                          : isOfferActive(offer)
                            ? 'Suspend'
                            : 'Activate'}
                      </Button>
                    </td>
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
