'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
    <div className="mx-auto max-w-xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <p className="text-sm text-muted-foreground">
          {cart.lines.length} line(s) · version {cart.version}. Payment method is COD; store/vendor
          eligibility and order totals come only from the API response.
        </p>
      </header>

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4 border border-border p-4">
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Shipping address</legend>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Address line 1</span>
            <input
              name="line1"
              required
              className="h-10 rounded-md border border-border bg-background px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Address line 2</span>
            <input
              name="line2"
              className="h-10 rounded-md border border-border bg-background px-3"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">City</span>
              <input
                name="city"
                required
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Region</span>
              <input
                name="region"
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Postal code</span>
              <input
                name="postalCode"
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Country</span>
              <input
                name="countryCode"
                defaultValue="BD"
                required
                maxLength={2}
                className="h-10 rounded-md border border-border bg-background px-3 uppercase"
              />
            </label>
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Shipping method</span>
          <select
            name="shippingMethod"
            defaultValue="STANDARD"
            className="h-10 rounded-md border border-border bg-background px-3"
          >
            <option value="STANDARD">Standard</option>
          </select>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Payment</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="paymentMethod" value="COD" defaultChecked readOnly />
            Cash on delivery (COD) — eligibility enforced by backend
          </label>
        </fieldset>

        {submitError ? (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? 'Placing order…' : 'Place COD order'}
          </Button>
          <Link href="/cart" className="inline-flex h-10 items-center text-sm underline">
            Back to cart
          </Link>
        </div>
      </form>
    </div>
  );
}
