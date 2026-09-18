'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  createShipment,
  formatVendorMoney,
  getOrder,
  listStoreOrders,
  type VendorOrder,
  type VendorShipment,
} from '@/lib/vendor-api';
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
const SHIPPABLE_STATUSES = new Set(['PAID', 'PROCESSING', 'PARTIALLY_FULFILLED']);

const fieldClass = 'h-10 w-full rounded-md border border-border bg-background px-3 text-sm';
const labelClass = 'flex flex-col gap-1 text-sm';

type BulkRowResult =
  | { orderId: string; orderNumber: string; ok: true; shipment: VendorShipment }
  | { orderId: string; orderNumber: string; ok: false; error: string };

function matchesFilter(order: VendorOrder, filter: StatusFilter): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'PENDING') return PENDING_STATUSES.has(order.status);
  if (filter === 'RETURNS') return RETURN_STATUSES.has(order.status);
  return order.status === filter;
}

function remainingShipLines(order: VendorOrder): { lineId: string; quantity: number }[] {
  return order.lines
    .map((line) => ({
      lineId: line.lineId,
      quantity: Math.max(0, line.quantity - (line.fulfilledQuantity ?? 0)),
    }))
    .filter((line) => line.quantity > 0);
}

function isShippable(order: VendorOrder): boolean {
  return SHIPPABLE_STATUSES.has(order.status) && remainingShipLines(order).length > 0;
}

function addressLine(order: VendorOrder): string {
  const a = order.shippingAddress;
  if (!a) return '';
  return [a.line1, a.line2, a.city, a.region, a.postalCode, a.countryCode]
    .filter(Boolean)
    .join(', ');
}

export default function VendorOrdersPage() {
  const params = useParams<{ vendorId: string }>();
  const vendorId = params.vendorId;
  const [storeId, setStoreId] = useState<string | null>(null);
  const [orders, setOrders] = useState<VendorOrder[] | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkRowResult[] | null>(null);

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
          setSelectedIds(new Set());
          setBulkResults(null);
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

  const shippableVisible = useMemo(() => visible.filter(isShippable), [visible]);

  const allShippableSelected =
    shippableVisible.length > 0 && shippableVisible.every((o) => selectedIds.has(o.id));

  function toggleOne(orderId: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(orderId);
      else next.delete(orderId);
      return next;
    });
    setBulkResults(null);
  }

  function toggleAllShippable(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const order of shippableVisible) {
        if (checked) next.add(order.id);
        else next.delete(order.id);
      }
      return next;
    });
    setBulkResults(null);
  }

  async function onBulkShip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orders || selectedIds.size === 0) return;
    const form = new FormData(event.currentTarget);
    const provider = String(form.get('provider') || 'MANUAL').trim() as
      | 'STEADFAST'
      | 'PATHAO'
      | 'MANUAL';
    const recipientName = String(form.get('recipientName') || '').trim();
    const recipientPhone = String(form.get('recipientPhone') || '').trim();
    const recipientAddress = String(form.get('recipientAddress') || '').trim();
    const note = String(form.get('note') || '').trim();
    if (recipientName.length < 3) {
      setError('Recipient name must be at least 3 characters.');
      return;
    }
    if (!/^\d{11}$/.test(recipientPhone)) {
      setError('Recipient phone must be 11 digits.');
      return;
    }

    const targets = orders.filter((o) => selectedIds.has(o.id) && isShippable(o));
    if (targets.length === 0) {
      setError('Select at least one shippable order.');
      return;
    }

    setBulkPending(true);
    setError(null);
    setBulkResults(null);
    const results: BulkRowResult[] = [];

    for (const summary of targets) {
      try {
        // Refresh lines/address — list rows can lag after partial fulfill.
        const detail = await getOrder(summary.id);
        const lines = remainingShipLines(detail);
        if (lines.length === 0) {
          results.push({
            orderId: summary.id,
            orderNumber: summary.orderNumber,
            ok: false,
            error: 'No remaining quantity to ship.',
          });
          continue;
        }
        const addr = recipientAddress || addressLine(detail);
        const shipment = await createShipment({
          orderId: detail.id,
          provider,
          lines,
          recipientName,
          recipientPhone,
          idempotencyKey: crypto.randomUUID(),
          ...(addr.length >= 10 ? { recipientAddress: addr } : {}),
          ...(note ? { note } : {}),
        });
        results.push({
          orderId: summary.id,
          orderNumber: summary.orderNumber,
          ok: true,
          shipment,
        });
      } catch (err) {
        results.push({
          orderId: summary.id,
          orderNumber: summary.orderNumber,
          ok: false,
          error: err instanceof ApiClientError ? err.message : 'Create shipment failed.',
        });
      }
    }

    setBulkResults(results);
    setBulkPending(false);
    try {
      if (storeId) {
        setOrders(await listStoreOrders(storeId));
      }
    } catch {
      // keep prior list; per-row results already shown
    }
  }

  if (!storeId) {
    return (
      <p className="text-sm text-muted-foreground">Select a store in the header to list orders.</p>
    );
  }

  if (orders === null && !error) {
    return <p className="text-sm text-muted-foreground">Loading orders…</p>;
  }

  const selectedCount = [...selectedIds].filter((id) =>
    (orders ?? []).some((o) => o.id === id && isShippable(o)),
  ).length;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Orders</h2>
          <p className="text-sm text-muted-foreground">
            Store <span className="font-mono text-xs">{storeId}</span>
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={selectedCount === 0 || bulkPending}
          onClick={() => setBulkOpen((open) => !open)}
        >
          {bulkOpen ? 'Hide bulk ship' : `Bulk ship (${selectedCount})`}
        </Button>
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

      {bulkOpen ? (
        <section className="space-y-3 rounded-md border border-border bg-background p-4">
          <h3 className="text-sm font-semibold">Bulk create shipments</h3>
          <p className="text-xs text-muted-foreground">
            Creates one shipment per selected order via the existing fulfillment API. Failures do
            not roll back successes. Remaining unfulfilled line qty is shipped.
          </p>
          <form className="grid max-w-xl gap-3" onSubmit={(e) => void onBulkShip(e)}>
            <label className={labelClass}>
              Provider
              <select className={fieldClass} name="provider" defaultValue="MANUAL" required>
                <option value="MANUAL">MANUAL</option>
                <option value="STEADFAST">STEADFAST</option>
                <option value="PATHAO">PATHAO</option>
              </select>
            </label>
            <label className={labelClass}>
              Recipient name
              <input className={fieldClass} name="recipientName" required minLength={3} />
            </label>
            <label className={labelClass}>
              Recipient phone (11 digits)
              <input
                className={fieldClass}
                name="recipientPhone"
                required
                minLength={11}
                maxLength={11}
                pattern="\d{11}"
                inputMode="numeric"
              />
            </label>
            <label className={labelClass}>
              Recipient address (optional — falls back to each order address)
              <input className={fieldClass} name="recipientAddress" />
            </label>
            <label className={labelClass}>
              Note
              <input className={fieldClass} name="note" maxLength={500} />
            </label>
            <Button type="submit" size="sm" disabled={bulkPending || selectedCount === 0}>
              {bulkPending ? `Shipping ${selectedCount}…` : `Create ${selectedCount} shipment(s)`}
            </Button>
          </form>
          {bulkResults ? (
            <ul className="space-y-1 border-t border-border pt-3 text-xs">
              {bulkResults.map((row) => (
                <li key={row.orderId} className={row.ok ? 'text-foreground' : 'text-destructive'}>
                  <Link
                    href={`/vendor/${vendorId}/orders/${row.orderId}`}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {row.orderNumber}
                  </Link>
                  {row.ok
                    ? ` · ${row.shipment.provider} · ${row.shipment.shipmentId.slice(0, 8)}…${
                        row.shipment.trackingCode ? ` · ${row.shipment.trackingCode}` : ''
                      }`
                    : ` · ${row.error}`}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">
                <input
                  type="checkbox"
                  checked={allShippableSelected}
                  disabled={shippableVisible.length === 0}
                  onChange={(e) => toggleAllShippable(e.target.checked)}
                  aria-label="Select all shippable orders in this filter"
                />
              </th>
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
                <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                  {filter === 'ALL' ? 'No orders for this store.' : 'No orders match this filter.'}
                </td>
              </tr>
            ) : (
              visible.map((order) => {
                const shippable = isShippable(order);
                return (
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.id)}
                        disabled={!shippable}
                        onChange={(e) => toggleOne(order.id, e.target.checked)}
                        aria-label={
                          shippable
                            ? `Select ${order.orderNumber} for bulk ship`
                            : `${order.orderNumber} is not shippable`
                        }
                      />
                    </td>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
