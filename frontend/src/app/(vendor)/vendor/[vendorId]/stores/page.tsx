'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CreateStoreForm } from '@/components/vendor/create-store-form';
import { ApiClientError } from '@/lib/api-client';
import {
  getVendor,
  listStoresForVendor,
  type StoreSummary,
  type VendorSummary,
} from '@/lib/vendor-api';
import { getSelectedStoreId, setSelectedStoreId } from '@/lib/vendor-session';

export default function VendorStoresPage() {
  const params = useParams<{ vendorId: string }>();
  const vendorId = params.vendorId;
  const [vendor, setVendor] = useState<VendorSummary | null>(null);
  const [stores, setStores] = useState<StoreSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [vendorRow, rows] = await Promise.all([
      getVendor(vendorId),
      listStoresForVendor(vendorId),
    ]);
    setVendor(vendorRow);
    setStores(rows);
    const selected = getSelectedStoreId();
    if (!selected && rows[0]) {
      setSelectedStoreId(rows[0].id);
    }
  }, [vendorId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await reload();
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load stores.');
          setStores([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  if (stores === null && !error) {
    return <p className="text-sm text-muted-foreground">Loading stores…</p>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Stores</h2>
          <p className="text-sm text-muted-foreground">
            Each store has its own prices, inventory, and offers.
          </p>
        </div>
        <CreateStoreForm vendorId={vendorId} vendorStatus={vendor?.status ?? null} />
      </header>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Slug</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Currency</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {(stores ?? []).length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                  No stores yet — create your first store above.
                </td>
              </tr>
            ) : (
              (stores ?? []).map((store) => (
                <tr key={store.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{store.profile.displayName}</td>
                  <td className="px-3 py-2 font-mono text-xs">{store.storeCode ?? '—'}</td>
                  <td className="px-3 py-2">{store.profile.slug}</td>
                  <td className="px-3 py-2 capitalize">{store.status}</td>
                  <td className="px-3 py-2">{store.settings.currencyCode}</td>
                  <td className="px-3 py-2">
                    <Link
                      className="text-sm underline underline-offset-4"
                      href={`/vendor/${vendorId}/stores/${store.id}`}
                    >
                      Details
                    </Link>
                    {store.status === 'provisioning' || store.status === 'failed' ? (
                      <>
                        {' · '}
                        <Link
                          className="text-sm underline underline-offset-4"
                          href={`/vendor/${vendorId}/stores/${store.id}/setup`}
                        >
                          Setup
                        </Link>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
