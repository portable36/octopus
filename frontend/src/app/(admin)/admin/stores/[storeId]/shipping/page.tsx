'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ApiClientError, apiRequest } from '@/lib/api-client';
import { getAdminStore, type AdminStore } from '@/lib/admin-api';
import { useAccessToken } from '@/lib/use-access-token';

type CourierAccountStatus = {
  provider: string;
  configured: boolean;
  isActive: boolean;
  pathaoStoreId: number | null;
  updatedAt: string | null;
};

export default function AdminStoreShippingPage() {
  const params = useParams<{ storeId: string }>();
  const token = useAccessToken();
  const storeId = params.storeId;
  const [store, setStore] = useState<AdminStore | null>(null);
  const [rows, setRows] = useState<CourierAccountStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !storeId) return;
    try {
      const storeData = await getAdminStore(token, storeId);
      setStore(storeData);
      const accounts = await apiRequest<CourierAccountStatus[]>(
        `/fulfillment/vendors/${encodeURIComponent(storeData.vendorId)}/courier-accounts`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setRows(accounts);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load shipping status.');
    }
  }, [token, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!store && !error) {
    return <p className="text-sm text-muted-foreground">Loading shipping…</p>;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="space-y-3 border border-border bg-background p-4">
        <div>
          <h2 className="text-sm font-medium">Courier accounts (vendor-scoped)</h2>
          <p className="text-xs text-muted-foreground">
            Steadfast / Pathao credentials belong to the vendor, not this store. Edit them in the
            vendor portal; status below is read-only.
          </p>
        </div>
        {store ? (
          <p className="text-xs">
            <Link
              href={`/vendor/${store.vendorId}/courier`}
              className="underline underline-offset-2"
            >
              Open vendor courier settings →
            </Link>
          </p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="px-2 py-2 font-medium">Provider</th>
                <th className="px-2 py-2 font-medium">Configured</th>
                <th className="px-2 py-2 font-medium">Active</th>
                <th className="px-2 py-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-3 text-muted-foreground">
                    No courier providers configured yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.provider} className="border-b border-border/60">
                    <td className="px-2 py-2 font-mono text-xs">{row.provider}</td>
                    <td className="px-2 py-2">{row.configured ? 'Yes' : 'No'}</td>
                    <td className="px-2 py-2">{row.isActive ? 'Yes' : 'No'}</td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">
                      {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2 border border-border bg-background p-4">
        <h2 className="text-sm font-medium">Related</h2>
        <ul className="list-inside list-disc text-xs text-muted-foreground">
          <li>
            Platform tax / commission:{' '}
            <Link href="/admin/system/commerce" className="underline underline-offset-2">
              Commerce hub
            </Link>
          </li>
          <li>
            Store COD limits:{' '}
            <Link
              href={`/admin/stores/${storeId}/settings`}
              className="underline underline-offset-2"
            >
              Settings
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
