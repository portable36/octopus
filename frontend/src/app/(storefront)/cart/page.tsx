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
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Cart</h1>
        <p className="text-sm text-muted-foreground">
          Line prices are display snapshots. Checkout recalculates authoritative totals on the
          server.
        </p>
      </header>

      {loadError ? (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : null}

      {!cart ? (
        <p className="text-sm text-muted-foreground">Loading cart…</p>
      ) : cart.lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cart is empty.{' '}
          <Link href="/search" className="underline">
            Browse offers
          </Link>
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border border border-border">
            {cart.lines.map((line) => (
              <li
                key={line.lineId}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 space-y-1">
                  <Link
                    href={`/products/${line.productId}`}
                    className="font-medium hover:underline"
                  >
                    Product {line.productId.slice(0, 8)}…
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Store {line.storeId.slice(0, 8)}… · variant {line.variantId.slice(0, 8)}…
                  </p>
                  <p className="text-sm tabular-nums">
                    {formatMoney(line.unitPriceSnapshotMinor, line.currencyCode)} × {line.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-2">
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
                    className="h-9 w-16 rounded-md border border-border bg-background px-2 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busyLineId === line.lineId}
                    onClick={() => void onRemove(line.lineId)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 border border-border p-4">
            <p className="text-sm text-muted-foreground">
              Display subtotal hint:{' '}
              <span className="font-medium text-foreground tabular-nums">
                {formatMoney(hintTotal, cart.currencyCode)}
              </span>{' '}
              (not checkout truth)
            </p>
            <Link
              href="/checkout"
              className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Checkout
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
