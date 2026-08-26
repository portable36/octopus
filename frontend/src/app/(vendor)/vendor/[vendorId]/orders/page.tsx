'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ApiClientError } from '@/lib/api-client';
import { formatVendorMoney, listStoreOrders, type VendorOrder } from '@/lib/vendor-api';
import { getSelectedStoreId, subscribeSelectedStoreId } from '@/lib/vendor-session';

type StatusFilter =
  | 'ALL'
  | 'PENDING'
  | 'PROCESSING'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RETURNS';

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'PROCESSING', label: 'Processing' },
  { id: 'PARTIALLY_FULFILLED', label: 'Partial' },
  { id: 'FULFILLED', label: 'Fulfilled' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'RETURNS', label: 'Returns' },
];

const PENDING_STATUSES = new Set(['PENDING_PAYMENT', 'PAYMENT_FAILED', 'PAID']);
const RETURN_STATUSES = new Set(['RETURN_REQUESTED', 'RETURNED', 'REFUND_REQUESTED']);

function matchesFilter(order: VendorOrder, filter: StatusFilter): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'PENDING') return PENDING_STATUSES.has(order.status);
  if (filter === 'RETURNS') return RETURN_STATUSES.has(order.status);
  return order.status === filter;
}

export default function VendorOrdersPage() {
  const params = useParams<{ vendorId: string }>();
  const vendorId = params.vendorId;
  const [storeId, setStoreId] = useState<string | null>(null);
  const [orders, setOrders] = useState<VendorOrder[] | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setStoreId(getSelectedStoreId());
    sync();
    return subscribeSelectedStoreId(sync);
  }, []);

  useEffect(() => {
    if (!storeId) {
      setOrders(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listStoreOrders(storeId);
        if (!cancelled) {
          setOrders(rows);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load orders.');
          setOrders([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const visible = useMemo(
    () => (orders ?? []).filter((order) => matchesFilter(order, filter)),
    [orders, filter],
  );

  if (!storeId) {
    return (
      <p className="text-sm text-muted-foreground">Select a store in the header to list orders.</p>
    );
  }

  if (orders === null && !error) {
    return <p className="text-sm text-muted-foreground">Loading orders…</p>;
  }

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">Orders</h2>
        <p className="text-sm text-muted-foreground">
          Store <span className="font-mono text-xs">{storeId}</span>
        </p>
      </header>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={`rounded-md border px-2.5 py-1 text-xs ${
              filter === chip.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground'
            }`}
            aria-pressed={filter === chip.id}
            onClick={() => setFilter(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Order</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Payment</th>
              <th className="px-3 py-2 font-medium">Total</th>
              <th className="px-3 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
                  {filter === 'ALL' ? 'No orders for this store.' : 'No orders match this filter.'}
                </td>
              </tr>
            ) : (
              visible.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <Link
                      href={`/vendor/${vendorId}/orders/${order.id}`}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{order.status}</td>
                  <td className="px-3 py-2">{order.paymentStatus}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatVendorMoney(order.totalMinor, order.currencyCode)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString()}
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
