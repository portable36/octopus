'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiClientError } from '@/lib/api-client';
import { listAdminStoreOrders, type AdminOrderRow } from '@/lib/admin-api';
import { useAccessToken } from '@/lib/use-access-token';

export default function AdminStoreOrdersPage() {
  const params = useParams<{ storeId: string }>();
  const token = useAccessToken();
  const storeId = params.storeId;
  const [rows, setRows] = useState<AdminOrderRow[]>([]);
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
        const data = await listAdminStoreOrders(token, storeId);
        if (!cancelled) {
          setRows(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load orders.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, storeId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Orders</h2>
          <p className="text-xs text-muted-foreground">
            Store-scoped orders from Order Management (read).
          </p>
        </div>
        <Link href="/admin/orders" className="text-sm underline underline-offset-2">
          Platform orders
        </Link>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading orders…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!loading && !error ? (
        <div className="overflow-x-auto border border-border bg-background">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Order</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Payment</th>
                <th className="px-3 py-2 font-medium">Fulfillment</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                    No orders for this store.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{row.orderNumber}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.totalMinor} {row.currencyCode}
                    </td>
                    <td className="px-3 py-2">{row.paymentStatus}</td>
                    <td className="px-3 py-2">{row.fulfillmentStatus}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
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
