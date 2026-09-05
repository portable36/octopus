'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { pushToDataLayer, minorToMajor } from '@/infrastructure/analytics/dataLayer';
import { readStashedCheckoutOutcome, type CheckoutOutcome } from '@/lib/cart-api';
import { formatMoney } from '@/lib/storefront-api';

function providerDisplayName(provider: string | null): string {
  switch (provider?.toUpperCase()) {
    case 'BKASH':
      return 'bKash';
    case 'NAGAD':
      return 'Nagad';
    case 'SSLCOMMERZ':
      return 'SSLCommerz (Cards & Net Banking)';
    default:
      return provider || 'Payment Gateway';
  }
}

function ReceiptBody() {
  const searchParams = useSearchParams();
  const status = (searchParams.get('status') || '').toUpperCase();
  const orderId = searchParams.get('orderId') || '';
  const paymentIntentId = searchParams.get('paymentIntentId') || '';
  const provider = searchParams.get('provider') || '';

  const [outcome, setOutcome] = useState<CheckoutOutcome | null>(null);
  const purchaseTrackedRef = useRef(false);

  useEffect(() => {
    const stashed = readStashedCheckoutOutcome();
    if (stashed) {
      setOutcome(stashed);
    }
  }, []);

  const isSuccess = status === 'CAPTURED';
  const isCancelled = status === 'CANCELLED';
  const isFailed = status === 'FAILED';

  useEffect(() => {
    if (!isSuccess || purchaseTrackedRef.current) {
      return;
    }
    purchaseTrackedRef.current = true;
    if (outcome) {
      pushToDataLayer({
        event: 'purchase',
        transaction_id: outcome.checkoutId,
        currency: outcome.totals.currencyCode,
        value: minorToMajor(outcome.totals.grandTotalMinor),
        items: outcome.orders.map((order) => ({
          id: order.orderId,
          name: order.orderNumber,
          price: minorToMajor(order.totalMinor),
          sku: order.orderNumber,
          quantity: 1,
        })),
      });
    } else if (orderId) {
      pushToDataLayer({
        event: 'purchase',
        transaction_id: orderId,
        currency: 'BDT',
        value: 0,
        items: [
          {
            id: orderId,
            name: `Order ${orderId}`,
            price: 0,
            sku: orderId,
            quantity: 1,
          },
        ],
      });
    }
  }, [isSuccess, outcome, orderId]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="sf-eyebrow">Payment Verification</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          {isSuccess
            ? 'Payment Confirmed'
            : isCancelled
              ? 'Payment Cancelled'
              : isFailed
                ? 'Payment Failed'
                : 'Payment Status'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {providerDisplayName(provider)} · Reference {paymentIntentId || 'N/A'}
        </p>
      </header>

      {isSuccess && (
        <div className="sf-panel space-y-4 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white"
              aria-hidden="true"
            >
              ✓
            </span>
            <div>
              <h2 className="text-base font-semibold text-emerald-950 dark:text-emerald-200">
                Transaction Captured Successfully
              </h2>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                Your payment was verified and processed by {providerDisplayName(provider)}.
              </p>
            </div>
          </div>
          {orderId ? (
            <p className="text-sm">
              <strong className="text-muted-foreground">Order ID:</strong>{' '}
              <span className="font-mono">{orderId}</span>
            </p>
          ) : null}
        </div>
      )}

      {isCancelled && (
        <div className="sf-panel space-y-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-sm font-bold text-white"
              aria-hidden="true"
            >
              !
            </span>
            <div>
              <h2 className="text-base font-semibold text-amber-950 dark:text-amber-200">
                Payment Was Cancelled
              </h2>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                You cancelled the transaction on {providerDisplayName(provider)}. No money was
                charged.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/checkout" className="sf-button-primary">
              Return to Checkout
            </Link>
            <Link href="/cart" className="sf-button-secondary">
              Review Cart
            </Link>
          </div>
        </div>
      )}

      {isFailed && (
        <div className="sf-panel space-y-4 border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-sm font-bold text-white"
              aria-hidden="true"
            >
              ✕
            </span>
            <div>
              <h2 className="text-base font-semibold text-destructive">
                Payment Could Not Be Completed
              </h2>
              <p className="text-xs text-destructive/80">
                {providerDisplayName(provider)} was unable to authorize the charge. Please verify
                your account or card details and try again.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/checkout" className="sf-button-primary">
              Retry Payment
            </Link>
            <Link href="/cart" className="sf-button-secondary">
              Review Cart
            </Link>
          </div>
        </div>
      )}

      {outcome && isSuccess && (
        <>
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
                    Store {order.storeId.slice(0, 8)}… · {providerDisplayName(provider)} ·{' '}
                    {order.paymentStatus}
                  </p>
                  <p className="tabular-nums">
                    {formatMoney(order.totalMinor, order.currencyCode)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <Link href="/search" className="sf-button-secondary">
          Continue shopping
        </Link>
        <Link href="/" className="sf-button-secondary">
          Storefront Home
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutReceiptPage() {
  return (
    <Suspense
      fallback={
        <div className="sf-panel space-y-2 text-sm text-muted-foreground">
          Verifying payment receipt…
        </div>
      }
    >
      <ReceiptBody />
    </Suspense>
  );
}
