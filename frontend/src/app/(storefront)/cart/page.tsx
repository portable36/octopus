'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  getOrCreateCart,
  recalculateCart,
  removeCartLine,
  updateCartLineQuantity,
  type CartResponse,
  type RecalculateCartResponse,
} from '@/lib/cart-api';
import { formatMoney } from '@/lib/storefront-api';

export default function CartPage() {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyLineId, setBusyLineId] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [recalc, setRecalc] = useState<RecalculateCartResponse | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  const fetchCalculatedTotals = useCallback(async (cartId: string, coupon?: string) => {
    setRecalculating(true);
    setPromoError(null);
    try {
      const result = await recalculateCart({
        cartId,
        ...(coupon && coupon.trim() ? { couponCode: coupon.trim() } : {}),
      });
      setRecalc(result);
      if (coupon && coupon.trim()) {
        setAppliedCoupon(coupon.trim().toUpperCase());
        setPromoMessage(`Coupon "${coupon.trim().toUpperCase()}" applied!`);
      } else {
        setAppliedCoupon(null);
      }
    } catch (error) {
      if (coupon && coupon.trim()) {
        setPromoError(error instanceof ApiClientError ? error.message : 'Invalid coupon code.');
      }
    } finally {
      setRecalculating(false);
    }
  }, []);

  const reload = useCallback(async () => {
    try {
      const next = await getOrCreateCart();
      setCart(next);
      setLoadError(null);
      if (next.lines.length > 0) {
        void fetchCalculatedTotals(next.id, appliedCoupon ?? undefined);
      } else {
        setRecalc(null);
      }
    } catch (error) {
      setLoadError(error instanceof ApiClientError ? error.message : 'Failed to load cart.');
    }
  }, [appliedCoupon, fetchCalculatedTotals]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onQuantity(lineId: string, quantity: number) {
    if (!cart || quantity < 1) {
      return;
    }
    setBusyLineId(lineId);
    try {
      const next = await updateCartLineQuantity({ cartId: cart.id, lineId, quantity });
      setCart(next);
    } catch (error) {
      setLoadError(error instanceof ApiClientError ? error.message : 'Update failed.');
    } finally {
      setBusyLineId(null);
    }
  }

  async function onRemove(lineId: string) {
    if (!cart) {
      return;
    }
    setBusyLineId(lineId);
    try {
      const next = await removeCartLine({ cartId: cart.id, lineId });
      setCart(next);
    } catch (error) {
      setLoadError(error instanceof ApiClientError ? error.message : 'Remove failed.');
    } finally {
      setBusyLineId(null);
    }
  }

  async function onApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!cart || !couponInput.trim()) return;
    setPromoMessage(null);
    await fetchCalculatedTotals(cart.id, couponInput.trim());
  }

  async function onRemoveCoupon() {
    if (!cart) return;
    setCouponInput('');
    setAppliedCoupon(null);
    setPromoMessage(null);
    setPromoError(null);
    await fetchCalculatedTotals(cart.id, undefined);
  }

  const hintTotal =
    cart?.lines.reduce((sum, line) => sum + line.unitPriceSnapshotMinor * line.quantity, 0) ?? 0;

  const displaySubtotal = recalc ? recalc.displaySubtotalMinor : hintTotal;
  const displayDiscount = recalc ? recalc.displayDiscountMinor : 0;
  const displayTotal = recalc ? recalc.displayTotalMinor : hintTotal;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="sf-eyebrow">Your selection</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Cart</h1>
        <p className="text-sm text-muted-foreground">
          Review your items before checkout. Final prices and availability are confirmed by the
          server.
        </p>
      </header>

      {loadError ? (
        <p className="sf-panel text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : null}

      {!cart ? (
        <p className="text-sm text-muted-foreground">Loading cart…</p>
      ) : cart.lines.length === 0 ? (
        <div className="sf-panel space-y-3">
          <h2 className="text-lg font-semibold">Your cart is waiting</h2>
          <p className="text-sm text-muted-foreground">
            Add an offer from the marketplace to start your order.
          </p>
          <Link href="/search" className="sf-button-primary w-fit">
            Browse offers
          </Link>
        </div>
      ) : (
        <div className="sf-cart-layout">
          <ul className="sf-cart-list" aria-label="Cart items">
            {cart.lines.map((line) => (
              <li key={line.lineId} className="sf-cart-line">
                <div className="min-w-0 space-y-1">
                  <Link
                    href={`/products/${line.productId}`}
                    className="font-semibold hover:underline"
                  >
                    Product {line.productId.slice(0, 8)}…
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Store {line.storeId.slice(0, 8)}… · variant {line.variantId.slice(0, 8)}…
                  </p>
                  <p className="sf-price text-sm tabular-nums">
                    {formatMoney(line.unitPriceSnapshotMinor, line.currencyCode)} × {line.quantity}
                  </p>
                </div>
                <div className="sf-cart-controls">
                  <label className="sr-only" htmlFor={`qty-${line.lineId}`}>
                    Quantity
                  </label>
                  <input
                    id={`qty-${line.lineId}`}
                    type="number"
                    min={1}
                    max={99}
                    value={line.quantity}
                    disabled={busyLineId === line.lineId}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (Number.isFinite(next)) {
                        void onQuantity(line.lineId, next);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 rounded-full"
                    disabled={busyLineId === line.lineId}
                    onClick={() => void onRemove(line.lineId)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <aside className="sf-panel sf-cart-summary space-y-4" aria-label="Cart summary">
            <p className="sf-eyebrow">Summary</p>

            <div className="space-y-2 border-b pb-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="sf-price tabular-nums">
                  {formatMoney(displaySubtotal, cart.currencyCode)}
                </span>
              </div>

              {displayDiscount > 0 ? (
                <div className="flex items-center justify-between gap-3 text-sm text-emerald-600 dark:text-emerald-400">
                  <span>
                    Promotions & Discounts
                    {appliedCoupon ? ` (${appliedCoupon})` : ''}
                  </span>
                  <span className="tabular-nums">
                    −{formatMoney(displayDiscount, cart.currencyCode)}
                  </span>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3 pt-2 font-semibold">
                <span>Estimated Total</span>
                <span className="sf-price text-lg tabular-nums">
                  {formatMoney(displayTotal, cart.currencyCode)}
                </span>
              </div>
            </div>

            {/* Coupon Code Section */}
            <form onSubmit={(e) => void onApplyCoupon(e)} className="space-y-2">
              <label
                htmlFor="cart-coupon-input"
                className="text-xs font-medium text-muted-foreground"
              >
                Promo or Coupon Code
              </label>
              <div className="flex gap-2">
                <input
                  id="cart-coupon-input"
                  type="text"
                  placeholder="e.g. SAVE10"
                  className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm uppercase"
                  value={couponInput}
                  disabled={recalculating || Boolean(appliedCoupon)}
                  onChange={(e) => setCouponInput(e.target.value)}
                />
                {appliedCoupon ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive"
                    onClick={() => void onRemoveCoupon()}
                  >
                    Remove
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={recalculating || !couponInput.trim()}
                  >
                    {recalculating ? 'Checking…' : 'Apply'}
                  </Button>
                )}
              </div>
              {promoMessage ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400" role="status">
                  {promoMessage}
                </p>
              ) : null}
              {promoError ? (
                <p className="text-xs text-destructive" role="alert">
                  {promoError}
                </p>
              ) : null}
            </form>

            <p className="text-xs text-muted-foreground">
              Final discounts, taxes, and shipping are authoritatively calculated at checkout.
            </p>
            <Link
              href={
                appliedCoupon
                  ? `/checkout?coupon=${encodeURIComponent(appliedCoupon)}`
                  : '/checkout'
              }
              className="sf-button-primary block text-center"
            >
              Continue to checkout
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
