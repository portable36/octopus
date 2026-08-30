'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  getOrCreateCart,
  removeCartLine,
  updateCartLineQuantity,
  type CartResponse,
} from '@/lib/cart-api';
import { formatMoney } from '@/lib/storefront-api';

export default function CartPage() {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyLineId, setBusyLineId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const next = await getOrCreateCart();
      setCart(next);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof ApiClientError ? error.message : 'Failed to load cart.');
    }
  }, []);

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

  const hintTotal =
    cart?.lines.reduce((sum, line) => sum + line.unitPriceSnapshotMinor * line.quantity, 0) ?? 0;

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

          <aside className="sf-panel sf-cart-summary" aria-label="Cart summary">
            <p className="sf-eyebrow">Summary</p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Display subtotal</span>
              <span className="sf-price tabular-nums">
                {formatMoney(hintTotal, cart.currencyCode)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              This is a display hint, not the final checkout total.
            </p>
            <Link href="/checkout" className="sf-button-primary">
              Continue to checkout
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
