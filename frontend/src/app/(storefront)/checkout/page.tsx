'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { pushToDataLayer, minorToMajor } from '@/infrastructure/analytics/dataLayer';
import {
  cartLinesValueMinor,
  itemsFromCartLines,
} from '@/infrastructure/analytics/ecommerce-mappers';
import { ApiClientError } from '@/lib/api-client';
import {
  getOrCreateCart,
  stashCheckoutOutcome,
  submitCheckout,
  type CartResponse,
} from '@/lib/cart-api';
import { readAttributionForCheckout } from '@/lib/attribution';

function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const idempotencyKeyRef = useRef<string>(newIdempotencyKey());
  const checkoutTrackedRef = useRef(false);

  useEffect(() => {
    void (async () => {
      try {
        const next = await getOrCreateCart();
        setCart(next);
      } catch (error) {
        setLoadError(error instanceof ApiClientError ? error.message : 'Failed to load cart.');
      }
    })();
  }, []);

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
    setPending(true);
    setSubmitError(null);
    try {
      const outcome = await submitCheckout({
        cartId: cart.id,
        expectedCartVersion: cart.version,
        idempotencyKey: idempotencyKeyRef.current,
        paymentMethod: 'COD',
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
        attribution: readAttributionForCheckout(),
      });
      stashCheckoutOutcome(outcome);
      router.push(`/checkout/success?checkoutId=${encodeURIComponent(outcome.checkoutId)}`);
    } catch (error) {
      setSubmitError(
        error instanceof ApiClientError
          ? error.message
          : 'Checkout failed. Totals and COD eligibility are decided by the server.',
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
          {cart.lines.length} item(s) · Cash on delivery. Store eligibility and order totals are
          confirmed by the API.
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

        <fieldset className="space-y-2">
          <legend className="text-lg font-semibold">Payment</legend>
          <label className="flex items-center gap-2 rounded-xl border border-border p-3">
            <input type="radio" name="paymentMethod" value="COD" defaultChecked readOnly />
            <span>
              <strong className="block">Cash on delivery</strong>
              <small className="font-normal text-muted-foreground">
                Eligibility is checked when you place the order.
              </small>
            </span>
          </label>
        </fieldset>

        {submitError ? (
          <p className="sf-panel text-sm text-destructive" role="alert">
            {submitError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" className="sf-button-primary border-0" disabled={pending}>
            {pending ? 'Placing order…' : 'Place COD order'}
          </Button>
          <Link href="/cart" className="sf-button-secondary">
            Back to cart
          </Link>
        </div>
      </form>
    </div>
  );
}
