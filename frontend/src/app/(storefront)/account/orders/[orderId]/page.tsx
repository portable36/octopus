'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  fetchOrder,
  listOrderReturns,
  listReturnReasons,
  requestOrderRefund,
  requestReturn,
  type OrderSummary,
  type ReturnReason,
  type ReturnRecord,
} from '@/lib/account-api';
import { formatMoney } from '@/lib/storefront-api';

export default function AccountOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [reasons, setReasons] = useState<ReturnReason[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reload = useCallback(async () => {
    if (!orderId) {
      return;
    }
    try {
      const [orderRes, returnsRes, reasonsRes] = await Promise.all([
        fetchOrder(orderId),
        listOrderReturns(orderId),
        listReturnReasons(),
      ]);
      setOrder(orderRes);
      setReturns(returnsRes);
      setReasons(reasonsRes);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load order.');
    }
  }, [orderId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onRefund() {
    if (!orderId) {
      return;
    }
    setPending(true);
    try {
      setOrder(await requestOrderRefund(orderId));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Refund request failed.');
    } finally {
      setPending(false);
    }
  }

  async function onReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orderId || !order) {
      return;
    }
    const form = new FormData(event.currentTarget);
    const lineId = String(form.get('lineId') || '');
    const quantity = Number(form.get('quantity') || 1);
    const reasonCode = String(form.get('reasonCode') || '');
    setPending(true);
    try {
      await requestReturn({
        orderId,
        idempotencyKey: crypto.randomUUID(),
        note: String(form.get('note') || '').trim() || undefined,
        items: [{ orderItemId: lineId, quantity, reasonCode }],
      });
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Return request failed.');
    } finally {
      setPending(false);
    }
  }

  if (!order && !error) {
    return <p className="text-sm text-muted-foreground">Loading order…</p>;
  }

  if (!order) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error ?? 'Order not found'}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/account/orders" className="hover:underline">
            Orders
          </Link>
          <span aria-hidden="true"> / </span>
          {order.orderNumber}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{order.orderNumber}</h1>
        <p className="text-sm text-muted-foreground">
          {order.status} · {order.paymentMethod} · payment {order.paymentStatus} · fulfillment{' '}
          {order.fulfillmentStatus}
        </p>
      </header>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="space-y-2 border border-border p-4" aria-labelledby="pay-status">
        <h2 id="pay-status" className="text-sm font-medium">
          Payment / refund status
        </h2>
        <p className="text-sm">
          {order.paymentStatus}
          {order.paymentStatus === 'REFUNDED'
            ? ' — refund completed (order payment status from Order API; no separate customer refund list endpoint).'
            : order.paymentStatus === 'REFUND_REQUESTED'
              ? ' — refund requested.'
              : null}
        </p>
        {order.paymentStatus === 'PAID' || order.status === 'COMPLETED' ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => void onRefund()}
          >
            Request refund
          </Button>
        ) : null}
      </section>

      <section className="space-y-2" aria-labelledby="lines">
        <h2 id="lines" className="text-lg font-semibold">
          Lines
        </h2>
        <ul className="divide-y divide-border border border-border">
          {order.lines.map((line) => (
            <li key={line.lineId} className="flex justify-between gap-3 px-4 py-3 text-sm">
              <span>
                {line.productId.slice(0, 8)}… × {line.quantity}
              </span>
              <span className="tabular-nums">
                {formatMoney(line.lineTotalMinor, line.currencyCode)}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-sm font-medium tabular-nums">
          Total {formatMoney(order.totalMinor, order.currencyCode)}
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="returns">
        <h2 id="returns" className="text-lg font-semibold">
          Returns
        </h2>
        {returns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No return requests yet.</p>
        ) : (
          <ul className="divide-y divide-border border border-border">
            {returns.map((ret) => (
              <li key={ret.id} className="px-4 py-3 text-sm">
                <p className="font-medium">{ret.status}</p>
                <p className="text-muted-foreground">{ret.requestedAt}</p>
                {ret.customerNote ? <p>{ret.customerNote}</p> : null}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={(e) => void onReturn(e)} className="space-y-3 border border-border p-4">
          <h3 className="text-sm font-medium">Request a return</h3>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Line</span>
            <select
              name="lineId"
              required
              className="h-10 rounded-md border border-border bg-background px-3"
            >
              {order.lines.map((line) => (
                <option key={line.lineId} value={line.lineId}>
                  {line.productId.slice(0, 8)}… (qty {line.quantity})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm sm:w-32">
            <span className="text-muted-foreground">Quantity</span>
            <input
              name="quantity"
              type="number"
              min={1}
              defaultValue={1}
              required
              className="h-10 rounded-md border border-border bg-background px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Reason</span>
            <select
              name="reasonCode"
              required
              className="h-10 rounded-md border border-border bg-background px-3"
            >
              {reasons.map((reason) => (
                <option key={reason.code} value={reason.code}>
                  {reason.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Note</span>
            <textarea
              name="note"
              rows={2}
              className="rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
          <Button type="submit" disabled={pending || reasons.length === 0}>
            {pending ? 'Submitting…' : 'Submit return'}
          </Button>
        </form>
      </section>
    </div>
  );
}
