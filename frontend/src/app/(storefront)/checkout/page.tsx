'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { pushToDataLayer, minorToMajor } from '@/infrastructure/analytics/dataLayer';
import {
  cartLinesValueMinor,
  itemsFromCartLines,
} from '@/infrastructure/analytics/ecommerce-mappers';
import { ApiClientError } from '@/lib/api-client';
import {
  getOrCreateCart,
  recalculateCart,
  stashCheckoutOutcome,
  submitCheckout,
  type CartResponse,
  type CheckoutPaymentMethod,
  type RecalculateCartResponse,
} from '@/lib/cart-api';
import { formatMoney } from '@/lib/storefront-api';
import { readAttributionForCheckout } from '@/lib/attribution';

function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCoupon = searchParams.get('coupon')?.trim() || '';

  const [cart, setCart] = useState<CartResponse | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('BKASH');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [couponCode, setCouponCode] = useState(initialCoupon);
  const [recalc, setRecalc] = useState<RecalculateCartResponse | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>(newIdempotencyKey());
  const checkoutTrackedRef = useRef(false);

  const fetchPricingQuote = async (cartId: string, coupon?: string) => {
    setRecalculating(true);
    setCouponError(null);
    try {
      const result = await recalculateCart({
        cartId,
        ...(coupon && coupon.trim() ? { couponCode: coupon.trim() } : {}),
      });
      setRecalc(result);
      if (coupon && coupon.trim()) {
        setCouponMessage(`Coupon "${coupon.trim().toUpperCase()}" applied!`);
      }
    } catch (error) {
      if (coupon && coupon.trim()) {
        setCouponError(error instanceof ApiClientError ? error.message : 'Invalid coupon code.');
      }
    } finally {
      setRecalculating(false);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const next = await getOrCreateCart();
        setCart(next);
        if (next.lines.length > 0) {
          void fetchPricingQuote(next.id, initialCoupon || undefined);
        }
      } catch (error) {
        setLoadError(error instanceof ApiClientError ? error.message : 'Failed to load cart.');
      }
    })();
  }, [initialCoupon]);

  useEffect(() => {
    if (!cart || cart.lines.length === 0 || checkoutTrackedRef.current) {
      return;
    }
    checkoutTrackedRef.current = true;
    const items = itemsFromCartLines(cart.lines);
    pushToDataLayer({
      event: 'begin_checkout',
      currency: cart.currencyCode,
      value: minorToMajor(cartLinesValueMinor(cart.lines)),
      items,
    });
  }, [cart]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart || cart.lines.length === 0 || pending) {
      return;
    }
    const form = new FormData(event.currentTarget);
    const selectedMethod = (form.get('paymentMethod') as CheckoutPaymentMethod) || paymentMethod;
    setPending(true);
    setSubmitError(null);
    try {
      const outcome = await submitCheckout({
        cartId: cart.id,
        expectedCartVersion: cart.version,
        idempotencyKey: idempotencyKeyRef.current,
        paymentMethod: selectedMethod,
        shippingMethod: String(form.get('shippingMethod') || 'STANDARD'),
        shippingAddress: {
          line1: String(form.get('line1') || '').trim(),
          line2: String(form.get('line2') || '').trim() || undefined,
          city: String(form.get('city') || '').trim(),
          region: String(form.get('region') || '').trim() || undefined,
          postalCode: String(form.get('postalCode') || '').trim() || undefined,
          countryCode: String(form.get('countryCode') || 'BD')
            .trim()
            .toUpperCase(),
        },
        couponCode: couponCode.trim() ? couponCode.trim().toUpperCase() : undefined,
        attribution: readAttributionForCheckout(),
      });
      stashCheckoutOutcome(outcome);
      const gatewayRedirect = outcome.payments?.find((p) => p.redirectUrl)?.redirectUrl;
      if (gatewayRedirect) {
        window.location.href = gatewayRedirect;
        return;
      }
      router.push(`/checkout/success?checkoutId=${encodeURIComponent(outcome.checkoutId)}`);
    } catch (error) {
      setSubmitError(
        error instanceof ApiClientError
          ? error.message
          : 'Checkout failed. Totals and payment eligibility are decided by the server.',
      );
      // Conflict / validation: new attempt needs a fresh idempotency key.
      if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) {
        idempotencyKeyRef.current = newIdempotencyKey();
      }
    } finally {
      setPending(false);
    }
  }

  if (loadError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {loadError}
      </p>
    );
  }

  if (!cart) {
    return <p className="text-sm text-muted-foreground">Loading checkout…</p>;
  }

  if (cart.lines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Cart is empty.{' '}
        <Link href="/cart" className="underline">
          Back to cart
        </Link>
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <ol className="sf-checkout-steps" aria-label="Checkout progress">
        <li className="sf-checkout-step-complete">
          <span>1</span>
          Cart
        </li>
        <li className="sf-checkout-step-active" aria-current="step">
          <span>2</span>
          Delivery
        </li>
        <li>
          <span>3</span>
          Confirmation
        </li>
      </ol>
      <header className="space-y-2">
        <p className="sf-eyebrow">Almost yours</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Checkout</h1>
        <p className="text-sm text-muted-foreground">
          {cart.lines.length} item(s) · Pay via bKash, Nagad, Cards, or Cash on Delivery. Order
          totals and payment eligibility are confirmed by the server.
        </p>
      </header>

      <form onSubmit={(e) => void onSubmit(e)} className="sf-panel sf-form">
        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold">Where should we deliver?</legend>
          <label>
            <span>Address line 1</span>
            <input name="line1" required />
          </label>
          <label>
            <span>
              Address line 2 <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <input name="line2" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span>City</span>
              <input name="city" required />
            </label>
            <label>
              <span>
                Region <span className="font-normal text-muted-foreground">(optional)</span>
              </span>
              <input name="region" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span>
                Postal code <span className="font-normal text-muted-foreground">(optional)</span>
              </span>
              <input name="postalCode" />
            </label>
            <label>
              <span>Country</span>
              <input name="countryCode" defaultValue="BD" required maxLength={2} />
            </label>
          </div>
        </fieldset>

        <label>
          <span>Shipping method</span>
          <select name="shippingMethod" defaultValue="STANDARD">
            <option value="STANDARD">Standard</option>
          </select>
        </label>

        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold">Payment method</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                paymentMethod === 'BKASH'
                  ? 'border-primary bg-primary/5 shadow-xs'
                  : 'border-border hover:bg-muted/30'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="BKASH"
                checked={paymentMethod === 'BKASH'}
                onChange={() => setPaymentMethod('BKASH')}
                className="mt-1"
              />
              <span className="space-y-1">
                <strong className="block text-sm font-semibold">bKash</strong>
                <small className="block text-xs text-muted-foreground leading-relaxed">
                  Fast & secure mobile payment via bKash wallet, app, or USSD.
                </small>
              </span>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                paymentMethod === 'NAGAD'
                  ? 'border-primary bg-primary/5 shadow-xs'
                  : 'border-border hover:bg-muted/30'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="NAGAD"
                checked={paymentMethod === 'NAGAD'}
                onChange={() => setPaymentMethod('NAGAD')}
                className="mt-1"
              />
              <span className="space-y-1">
                <strong className="block text-sm font-semibold">Nagad</strong>
                <small className="block text-xs text-muted-foreground leading-relaxed">
                  Instant mobile payment through your Nagad account.
                </small>
              </span>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                paymentMethod === 'SSLCOMMERZ'
                  ? 'border-primary bg-primary/5 shadow-xs'
                  : 'border-border hover:bg-muted/30'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="SSLCOMMERZ"
                checked={paymentMethod === 'SSLCOMMERZ'}
                onChange={() => setPaymentMethod('SSLCOMMERZ')}
                className="mt-1"
              />
              <span className="space-y-1">
                <strong className="block text-sm font-semibold">Cards & Net Banking</strong>
                <small className="block text-xs text-muted-foreground leading-relaxed">
                  Visa, Mastercard, Amex, DBBL Nexus, and local internet banking.
                </small>
              </span>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                paymentMethod === 'COD'
                  ? 'border-primary bg-primary/5 shadow-xs'
                  : 'border-border hover:bg-muted/30'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="COD"
                checked={paymentMethod === 'COD'}
                onChange={() => setPaymentMethod('COD')}
                className="mt-1"
              />
              <span className="space-y-1">
                <strong className="block text-sm font-semibold">Cash on delivery</strong>
                <small className="block text-xs text-muted-foreground leading-relaxed">
                  Pay with cash upon physical delivery. Eligibility verified at order.
                </small>
              </span>
            </label>
          </div>
        </fieldset>

        {/* Order Totals & Discount Breakdown */}
        {cart && (
          <fieldset className="space-y-3">
            <legend className="text-lg font-semibold">Order Summary</legend>
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items ({cart.lines.length})</span>
                <span className="tabular-nums">
                  {formatMoney(
                    recalc
                      ? recalc.displaySubtotalMinor
                      : cart.lines.reduce(
                          (sum, line) => sum + line.unitPriceSnapshotMinor * line.quantity,
                          0,
                        ),
                    cart.currencyCode,
                  )}
                </span>
              </div>

              {recalc && recalc.displayDiscountMinor > 0 ? (
                <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>
                    Promotion Discount
                    {couponCode ? ` (${couponCode.trim().toUpperCase()})` : ''}
                  </span>
                  <span className="tabular-nums">
                    −{formatMoney(recalc.displayDiscountMinor, cart.currencyCode)}
                  </span>
                </div>
              ) : null}

              {/* Coupon input on checkout */}
              <div className="pt-2 border-t border-border/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon code"
                    value={couponCode}
                    disabled={pending || recalculating}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending || recalculating}
                    onClick={() => {
                      if (cart) {
                        void fetchPricingQuote(cart.id, couponCode.trim());
                      }
                    }}
                  >
                    {recalculating ? 'Checking…' : 'Apply'}
                  </Button>
                </div>
                {couponMessage ? (
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                    {couponMessage}
                  </p>
                ) : null}
                {couponError ? (
                  <p className="mt-1 text-xs text-destructive">{couponError}</p>
                ) : null}
              </div>

              <div className="flex justify-between text-base font-semibold pt-2 border-t border-border">
                <span>Total Due</span>
                <span className="tabular-nums">
                  {formatMoney(
                    recalc
                      ? recalc.displayTotalMinor
                      : cart.lines.reduce(
                          (sum, line) => sum + line.unitPriceSnapshotMinor * line.quantity,
                          0,
                        ),
                    cart.currencyCode,
                  )}
                </span>
              </div>
            </div>
          </fieldset>
        )}

        {submitError ? (
          <p className="sf-panel text-sm text-destructive" role="alert">
            {submitError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" className="sf-button-primary border-0" disabled={pending}>
            {pending
              ? paymentMethod === 'COD'
                ? 'Placing order…'
                : 'Redirecting to payment…'
              : paymentMethod === 'BKASH'
                ? 'Pay with bKash'
                : paymentMethod === 'NAGAD'
                  ? 'Pay with Nagad'
                  : paymentMethod === 'SSLCOMMERZ'
                    ? 'Pay with Cards / Banking'
                    : 'Place COD order'}
          </Button>
          <Link href="/cart" className="sf-button-secondary">
            Back to cart
          </Link>
        </div>
      </form>
    </div>
  );
}
