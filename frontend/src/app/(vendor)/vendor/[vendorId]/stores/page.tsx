'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ApiClientError } from '@/lib/api-client';
import { listStoresForVendor, type StoreSummary } from '@/lib/vendor-api';

export default function VendorStoresPage() {
  const params = useParams<{ vendorId: string }>();
  const vendorId = params.vendorId;
  const [stores, setStores] = useState<StoreSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listStoresForVendor(vendorId);
        if (!cancelled) {
          setStores(rows);
          setError(null);
        }
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
  }, [vendorId]);

  if (stores === null && !error) {
    return <p className="text-sm text-muted-foreground">Loading stores…</p>;
  }

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">Stores</h2>
        <p className="text-sm text-muted-foreground">Stores for this vendor.</p>
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
              <th className="px-3 py-2 font-medium">Slug</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Currency</th>
            </tr>
          </thead>
          <tbody>
            {(stores ?? []).length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                  No stores yet.
                </td>
              </tr>
            ) : (
              (stores ?? []).map((store) => (
                <tr key={store.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{store.profile.displayName}</td>
                  <td className="px-3 py-2">{store.profile.slug}</td>
                  <td className="px-3 py-2">{store.status}</td>
                  <td className="px-3 py-2">{store.settings.currencyCode}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
