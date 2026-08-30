'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { readStashedCheckoutOutcome, type CheckoutOutcome } from '@/lib/cart-api';
import { formatMoney } from '@/lib/storefront-api';

function SuccessBody() {
  const searchParams = useSearchParams();
  const checkoutId = searchParams.get('checkoutId');
  const [outcome, setOutcome] = useState<CheckoutOutcome | null>(null);

  useEffect(() => {
    const stashed = readStashedCheckoutOutcome();
    if (stashed && (!checkoutId || stashed.checkoutId === checkoutId)) {
      setOutcome(stashed);
    }
  }, [checkoutId]);

  if (!outcome) {
    return (
      <div className="sf-panel space-y-4">
        <p className="sf-eyebrow">Checkout complete</p>
        <h1 className="text-3xl font-semibold tracking-tight">Order placed</h1>
        <p className="text-sm text-muted-foreground">
          Checkout completed{checkoutId ? ` (${checkoutId.slice(0, 8)}…)` : ''}, but the result is
          not in this browser session. Sign in later (Phase 18.4) to view orders from the account
          API.
        </p>
        <Link href="/" className="text-sm underline">
          Home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="sf-eyebrow">Checkout complete</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Order confirmed</h1>
        <p className="text-sm text-muted-foreground">
          Server checkout {outcome.checkoutId.slice(0, 8)}… · {outcome.paymentMethod} ·{' '}
          {outcome.orders.length} store order(s)
        </p>
      </header>

      <section className="sf-panel space-y-2" aria-labelledby="totals">
        <h2 id="totals" className="text-sm font-medium">
          Authoritative totals (server)
        </h2>
        <dl className="grid gap-1 text-sm tabular-nums sm:grid-cols-2">
          <div className="flex justify-between gap-4 sm:block">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatMoney(outcome.totals.subtotalMinor, outcome.totals.currencyCode)}</dd>
          </div>
          <div className="flex justify-between gap-4 sm:block">
            <dt className="text-muted-foreground">Discount</dt>
            <dd>{formatMoney(outcome.totals.discountMinor, outcome.totals.currencyCode)}</dd>
          </div>
          <div className="flex justify-between gap-4 sm:block">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd>{formatMoney(outcome.totals.shippingMinor, outcome.totals.currencyCode)}</dd>
          </div>
          <div className="flex justify-between gap-4 sm:block">
            <dt className="text-muted-foreground">Tax</dt>
            <dd>{formatMoney(outcome.totals.taxMinor, outcome.totals.currencyCode)}</dd>
          </div>
          <div className="flex justify-between gap-4 font-medium sm:col-span-2 sm:block">
            <dt>Grand total</dt>
            <dd>{formatMoney(outcome.totals.grandTotalMinor, outcome.totals.currencyCode)}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2" aria-labelledby="orders">
        <h2 id="orders" className="text-lg font-semibold">
          Orders by store
        </h2>
        <ul className="sf-order-list">
          {outcome.orders.map((order) => (
            <li key={order.orderId} className="space-y-1 px-4 py-3 text-sm">
              <p className="font-medium">{order.orderNumber}</p>
              <p className="text-muted-foreground">
                Store {order.storeId.slice(0, 8)}… · {order.paymentMethod} · {order.paymentStatus}
              </p>
              <p className="tabular-nums">{formatMoney(order.totalMinor, order.currencyCode)}</p>
            </li>
          ))}
        </ul>
      </section>

      <Link href="/search" className="inline-flex text-sm underline">
        Continue shopping
      </Link>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <SuccessBody />
    </Suspense>
  );
}
