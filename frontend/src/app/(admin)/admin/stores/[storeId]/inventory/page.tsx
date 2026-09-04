'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiClientError } from '@/lib/api-client';
import {
  listAdminInventoryItems,
  listAdminStoreWarehouses,
  type AdminInventoryItemRow,
  type AdminWarehouseRow,
} from '@/lib/admin-api';
import { useAccessToken } from '@/lib/use-access-token';

export default function AdminStoreInventoryPage() {
  const params = useParams<{ storeId: string }>();
  const token = useAccessToken();
  const storeId = params.storeId;
  const [warehouses, setWarehouses] = useState<AdminWarehouseRow[]>([]);
  const [items, setItems] = useState<AdminInventoryItemRow[]>([]);
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
        const [wh, stock] = await Promise.all([
          listAdminStoreWarehouses(token, storeId),
          listAdminInventoryItems(token, storeId, 100),
        ]);
        if (!cancelled) {
          setWarehouses(wh);
          setItems(stock);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load inventory.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, storeId]);

  const available = items.reduce((sum, row) => sum + row.available, 0);
  const reserved = items.reduce((sum, row) => sum + row.reserved, 0);
  const lowStock = items.filter(
    (row) => row.available <= row.lowStockThreshold && row.available > 0,
  ).length;
  const outOfStock = items.filter((row) => row.available <= 0).length;
  const warehouseName = new Map(warehouses.map((w) => [w.id, w.name]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium">Inventory</h2>
        <p className="text-xs text-muted-foreground">
          Stock truth from Inventory. Mutations stay on inventory/POS flows.
        </p>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading inventory…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!loading && !error ? (
        <>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              SKUs <strong className="tabular-nums">{items.length}</strong>
            </span>
            <span>
              Available <strong className="tabular-nums">{available}</strong>
            </span>
            <span>
              Reserved <strong className="tabular-nums">{reserved}</strong>
            </span>
            <span>
              Low stock <strong className="tabular-nums">{lowStock}</strong>
            </span>
            <span>
              Out of stock <strong className="tabular-nums">{outOfStock}</strong>
            </span>
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Warehouses</h3>
            <div className="overflow-x-auto border border-border bg-background">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Address</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouses.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                        No warehouses provisioned.
                      </td>
                    </tr>
                  ) : (
                    warehouses.map((wh) => (
                      <tr key={wh.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">{wh.name}</td>
                        <td className="px-3 py-2 font-mono text-xs">{wh.code}</td>
                        <td className="px-3 py-2">{wh.status}</td>
                        <td className="px-3 py-2 text-muted-foreground">{wh.addressLine ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Stock items</h3>
            <div className="overflow-x-auto border border-border bg-background">
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
                  {items.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                        No inventory items.
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 font-mono text-xs">
                          {row.variantId.slice(0, 8)}…
                        </td>
                        <td className="px-3 py-2">
                          {warehouseName.get(row.warehouseId) ?? row.warehouseId.slice(0, 8)}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{row.onHand}</td>
                        <td className="px-3 py-2 tabular-nums">{row.reserved}</td>
                        <td className="px-3 py-2 tabular-nums">{row.available}</td>
                        <td className="px-3 py-2">{row.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
