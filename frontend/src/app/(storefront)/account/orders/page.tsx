'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiClientError } from '@/lib/api-client';
import { listMyOrders, type OrderSummary } from '@/lib/account-api';
import { formatMoney } from '@/lib/storefront-api';

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setOrders(await listMyOrders());
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load orders.');
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">Your store orders from the Order API.</p>
      </header>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {orders.length === 0 && !error ? (
        <p className="text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        <ul className="divide-y divide-border border border-border">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="text-sm">
                <Link href={`/account/orders/${order.id}`} className="font-medium hover:underline">
                  {order.orderNumber}
                </Link>
                <p className="text-muted-foreground">
                  {order.status} · payment {order.paymentStatus}
                  {order.paymentStatus === 'REFUNDED' || order.paymentStatus === 'REFUND_REQUESTED'
                    ? ' (refund)'
                    : ''}
                </p>
                <p className="text-xs text-muted-foreground">{order.createdAt}</p>
              </div>
              <p className="text-sm font-medium tabular-nums">
                {formatMoney(order.totalMinor, order.currencyCode)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
