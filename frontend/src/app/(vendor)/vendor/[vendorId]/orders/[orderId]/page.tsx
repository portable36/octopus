'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  cancelOrder,
  cancelReturn,
  completeOrder,
  createOrderReturn,
  createShipment,
  formatVendorMoney,
  fulfillOrderLine,
  getOrder,
  listOrderReturns,
  listReturnReasons,
  markShipmentDelivered,
  startOrderProcessing,
  syncShipmentStatus,
  type VendorOrder,
  type VendorReturn,
  type VendorReturnReason,
  type VendorShipment,
} from '@/lib/vendor-api';

const fieldClass = 'h-10 rounded-md border border-border bg-background px-3 text-sm';
const labelClass = 'flex flex-col gap-1 text-sm';
const sectionClass = 'space-y-3 rounded-md border border-border bg-background p-4';

function formString(form: FormData, name: string): string {
  return String(form.get(name) || '').trim();
}

function formInt(form: FormData, name: string): number {
  return Number.parseInt(String(form.get(name) || ''), 10);
}

function addressLine(order: VendorOrder): string {
  const a = order.shippingAddress;
  if (!a) return '';
  return [a.line1, a.line2, a.city, a.region, a.postalCode, a.countryCode]
    .filter(Boolean)
    .join(', ');
}

export default function VendorOrderDetailPage() {
  const params = useParams<{ vendorId: string; orderId: string }>();
  const { vendorId, orderId } = params;
  const [order, setOrder] = useState<VendorOrder | null>(null);
  const [returns, setReturns] = useState<VendorReturn[]>([]);
  const [reasons, setReasons] = useState<VendorReturnReason[]>([]);
  const [shipment, setShipment] = useState<VendorShipment | null>(null);
  const [fulfillQty, setFulfillQty] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reloadReturns = useCallback(async (id: string) => {
    const [rows, reasonRows] = await Promise.all([listOrderReturns(id), listReturnReasons()]);
    setReturns(rows);
    setReasons(reasonRows);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const row = await getOrder(orderId);
        if (cancelled) return;
        setOrder(row);
        setFulfillQty(
          Object.fromEntries(
            row.lines.map((line) => {
              const remaining = Math.max(1, line.quantity - (line.fulfilledQuantity ?? 0));
              return [line.lineId, String(remaining)];
            }),
          ),
        );
        await reloadReturns(orderId);
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load order.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, reloadReturns]);

  async function run(action: () => Promise<void>) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Action failed.');
    } finally {
      setPending(false);
    }
  }

  async function onFulfillLine(lineId: string) {
    const quantity = Number.parseInt(fulfillQty[lineId] || '', 10);
    if (!Number.isFinite(quantity) || quantity < 1) {
      setError('Fulfill quantity must be at least 1.');
      return;
    }
    await run(async () => {
      const next = await fulfillOrderLine(orderId, lineId, quantity);
      setOrder(next);
      setMessage(`Fulfilled ${quantity} on line.`);
    });
  }

  async function onCreateShipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    const form = new FormData(event.currentTarget);
    const provider = formString(form, 'provider') as 'STEADFAST' | 'PATHAO' | 'MANUAL';
    const lines = order.lines
      .map((line) => ({
        lineId: line.lineId,
        quantity: formInt(form, `shipQty-${line.lineId}`),
      }))
      .filter((line) => Number.isFinite(line.quantity) && line.quantity > 0);
    if (lines.length === 0) {
      setError('Select at least one line quantity to ship.');
      return;
    }
    await run(async () => {
      const addr = formString(form, 'recipientAddress');
      const created = await createShipment({
        orderId,
        provider,
        lines,
        recipientName: formString(form, 'recipientName'),
        recipientPhone: formString(form, 'recipientPhone'),
        idempotencyKey: crypto.randomUUID(),
        ...(addr.length >= 10 ? { recipientAddress: addr } : {}),
        ...(formString(form, 'note') ? { note: formString(form, 'note') } : {}),
      });
      setShipment(created);
      setMessage(`Shipment ${created.shipmentId.slice(0, 8)}… created.`);
    });
  }

  async function onCreateReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const orderItemId = formString(form, 'orderItemId');
    const quantity = formInt(form, 'quantity');
    const reasonCode = formString(form, 'reasonCode');
    if (!orderItemId || !reasonCode || !Number.isFinite(quantity) || quantity < 1) {
      setError('Return needs a line, quantity ≥ 1, and reason.');
      return;
    }
    await run(async () => {
      await createOrderReturn({
        orderId,
        idempotencyKey: crypto.randomUUID(),
        items: [{ orderItemId, quantity, reasonCode }],
        ...(formString(form, 'note') ? { note: formString(form, 'note') } : {}),
      });
      await reloadReturns(orderId);
      setMessage('Return requested.');
      formEl.reset();
    });
  }

  if (!order && !error) {
    return <p className="text-sm text-muted-foreground">Loading order…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">
        <Link
          href={`/vendor/${vendorId}/orders`}
          className="text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Orders
        </Link>
      </p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      {order ? (
        <>
          <header className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">{order.orderNumber}</h2>
            <p className="text-sm text-muted-foreground">
              {order.status} · payment {order.paymentStatus} · fulfillment {order.fulfillmentStatus}
            </p>
            <p className="text-sm text-muted-foreground">
              Store <span className="font-mono text-xs">{order.storeId}</span>
            </p>
            <p className="text-sm tabular-nums">
              Total {formatVendorMoney(order.totalMinor, order.currencyCode)}
            </p>
          </header>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                void run(async () => {
                  setOrder(await startOrderProcessing(orderId));
                  setMessage('Processing started.');
                })
              }
            >
              Start processing
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                void run(async () => {
                  setOrder(await completeOrder(orderId));
                  setMessage('Order completed.');
                })
              }
            >
              Complete
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                void run(async () => {
                  setOrder(await cancelOrder(orderId));
                  setMessage('Order cancelled.');
                })
              }
            >
              Cancel order
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border border-border bg-background">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Line</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Fulfilled</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Fulfill</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => (
                  <tr key={line.lineId} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{line.variantId.slice(0, 8)}…</td>
                    <td className="px-3 py-2">{line.quantity}</td>
                    <td className="px-3 py-2">{line.fulfilledQuantity ?? 0}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatVendorMoney(line.lineTotalMinor, line.currencyCode)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <input
                          className={`${fieldClass} w-20`}
                          type="number"
                          min={1}
                          value={fulfillQty[line.lineId] ?? '1'}
                          onChange={(e) =>
                            setFulfillQty((prev) => ({ ...prev, [line.lineId]: e.target.value }))
                          }
                          aria-label={`Fulfill qty for ${line.lineId}`}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => void onFulfillLine(line.lineId)}
                        >
                          Fulfill
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className={sectionClass}>
            <h3 className="text-sm font-semibold">Shipping</h3>
            <form className="grid max-w-xl gap-3" onSubmit={(e) => void onCreateShipment(e)}>
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
                />
              </label>
              <label className={labelClass}>
                Recipient address
                <input
                  className={fieldClass}
                  name="recipientAddress"
                  defaultValue={addressLine(order)}
                />
              </label>
              <label className={labelClass}>
                Note
                <input className={fieldClass} name="note" maxLength={500} />
              </label>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Line quantities</legend>
                {order.lines.map((line) => (
                  <label key={line.lineId} className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-xs w-24">{line.variantId.slice(0, 8)}…</span>
                    <input
                      className={`${fieldClass} w-20`}
                      type="number"
                      name={`shipQty-${line.lineId}`}
                      min={0}
                      defaultValue={line.quantity}
                    />
                    <span className="text-muted-foreground">/ {line.quantity}</span>
                  </label>
                ))}
              </fieldset>
              <Button type="submit" size="sm" disabled={pending}>
                Create shipment
              </Button>
            </form>
            {/* ponytail: lastShipment only — no list API; upgrade when GET shipments exists */}
            {shipment ? (
              <div className="space-y-2 border-t border-border pt-3 text-sm">
                <p>
                  Last shipment <span className="font-mono text-xs">{shipment.shipmentId}</span> ·{' '}
                  {shipment.provider} · {shipment.status}
                  {shipment.trackingCode ? ` · tracking ${shipment.trackingCode}` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      void run(async () => {
                        const next = await syncShipmentStatus(shipment.shipmentId);
                        setShipment(next);
                        setMessage('Shipment status synced.');
                      })
                    }
                  >
                    Sync status
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      void run(async () => {
                        const next = await markShipmentDelivered(shipment.shipmentId, {
                          idempotencyKey: crypto.randomUUID(),
                        });
                        setShipment(next);
                        setMessage('Marked delivered.');
                      })
                    }
                  >
                    Mark delivered
                  </Button>
                </div>
              </div>
            ) : null}
          </section>

          <section className={sectionClass}>
            <h3 className="text-sm font-semibold">Returns</h3>
            {returns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No returns for this order.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {returns.map((ret) => (
                  <li
                    key={ret.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0"
                  >
                    <span>
                      <span className="font-mono text-xs">{ret.id.slice(0, 8)}…</span> ·{' '}
                      {ret.status} · {ret.items.length} item(s)
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        void run(async () => {
                          await cancelReturn(ret.id);
                          await reloadReturns(orderId);
                          setMessage('Return cancelled.');
                        })
                      }
                    >
                      Cancel return
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <form className="grid max-w-xl gap-3" onSubmit={(e) => void onCreateReturn(e)}>
              <label className={labelClass}>
                Line
                <select className={fieldClass} name="orderItemId" required defaultValue="">
                  <option value="" disabled>
                    Select line
                  </option>
                  {order.lines.map((line) => (
                    <option key={line.lineId} value={line.lineId}>
                      {line.variantId.slice(0, 8)}… (qty {line.quantity})
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Quantity
                <input className={fieldClass} type="number" name="quantity" min={1} required />
              </label>
              <label className={labelClass}>
                Reason
                <select className={fieldClass} name="reasonCode" required defaultValue="">
                  <option value="" disabled>
                    Select reason
                  </option>
                  {reasons.map((reason) => (
                    <option key={reason.code} value={reason.code}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Note
                <input className={fieldClass} name="note" maxLength={2000} />
              </label>
              <Button type="submit" size="sm" disabled={pending || reasons.length === 0}>
                Request return
              </Button>
            </form>
          </section>
        </>
      ) : null}
    </div>
  );
}
