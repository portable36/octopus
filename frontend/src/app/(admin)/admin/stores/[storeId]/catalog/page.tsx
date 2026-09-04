'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiClientError } from '@/lib/api-client';
import { listAdminStoreOffers, type AdminStoreOfferRow } from '@/lib/admin-api';
import { useAccessToken } from '@/lib/use-access-token';

export default function AdminStoreCatalogPage() {
  const params = useParams<{ storeId: string }>();
  const token = useAccessToken();
  const storeId = params.storeId;
  const [rows, setRows] = useState<AdminStoreOfferRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !storeId) {
      setLoading(false);
      setError('Authentication token required.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await listAdminStoreOffers(token, storeId);
        if (!cancelled) {
          setRows(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load store offers.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, storeId]);

  const active = rows.filter((r) => r.status === 'active').length;
  const draft = rows.filter((r) => r.status === 'draft').length;
  const suspended = rows.filter((r) => r.status === 'suspended').length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-medium">Catalog · store offers</h2>
        <p className="text-xs text-muted-foreground">
          Read-only offer list from Catalog. Product authoring stays in the vendor catalog.
        </p>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <span>
          Total <strong className="tabular-nums">{rows.length}</strong>
        </span>
        <span>
          Active <strong className="tabular-nums">{active}</strong>
        </span>
        <span>
          Draft <strong className="tabular-nums">{draft}</strong>
        </span>
        <span>
          Suspended <strong className="tabular-nums">{suspended}</strong>
        </span>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading offers…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!loading && !error ? (
        <div className="overflow-x-auto border border-border bg-background">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Offer</th>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Variant</th>
                <th className="px-3 py-2 font-medium">Price</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Available</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                    No store offers yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{row.id.slice(0, 8)}…</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.productId.slice(0, 8)}…</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.variantId.slice(0, 8)}…</td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.priceMinor} {row.currencyCode}
                    </td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">{row.isAvailable ? 'Yes' : 'No'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
