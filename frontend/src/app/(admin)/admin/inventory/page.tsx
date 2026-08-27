'use client';

import { useEffect, useState } from 'react';
import { useAccessToken } from '@/lib/use-access-token';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { ApiClientError } from '@/lib/api-client';
import {
  listAdminInventoryItems,
  listAdminStores,
  type AdminInventoryItemRow,
  type AdminStore,
} from '@/lib/admin-api';

export default function AdminInventoryPage() {
  const token = useAccessToken();
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [storeId, setStoreId] = useState('');
  const [rows, setRows] = useState<AdminInventoryItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Authentication token required.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await listAdminStores(token);
        if (!cancelled) {
          setStores(data);
          setStoreId(data[0]?.id ?? '');
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load stores.');
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
  }, [token]);

  useEffect(() => {
    if (!token || !storeId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await listAdminInventoryItems(token, storeId);
        if (!cancelled) {
          setRows(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load inventory.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, storeId]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Inventory"
        description="Store-scoped stock via GET /inventory/stores/:storeId/items (Inventory auth)."
      />
      {loading ? <p className="text-sm text-muted-foreground">Loading stores…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!loading && stores.length > 0 ? (
        <label className="flex max-w-md flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Store</span>
          <select
            className="rounded-md border border-border bg-background px-3 py-2"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.profile.displayName} ({store.status})
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {!loading && !error && storeId ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Variant</th>
                <th className="px-3 py-2 font-medium">Warehouse</th>
                <th className="px-3 py-2 font-medium">On hand</th>
                <th className="px-3 py-2 font-medium">Reserved</th>
                <th className="px-3 py-2 font-medium">Available</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                    No inventory items for this store.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{row.variantId.slice(0, 8)}…</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.warehouseId.slice(0, 8)}…</td>
                    <td className="px-3 py-2">{row.onHand}</td>
                    <td className="px-3 py-2">{row.reserved}</td>
                    <td className="px-3 py-2">{row.available}</td>
                    <td className="px-3 py-2">{row.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
      {!loading && !error && stores.length === 0 ? (
        <p className="text-sm text-muted-foreground">No stores yet.</p>
      ) : null}
    </div>
  );
}
