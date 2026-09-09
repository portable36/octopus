'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { listWishlist, removeFromWishlist, type WishlistItem } from '@/lib/engagement-api';

export default function AccountWishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reload = useCallback(async () => {
    try {
      const rows = await listWishlist();
      setItems(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load wishlist.');
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function remove(productId: string) {
    setPending(true);
    try {
      await removeFromWishlist(productId);
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to remove item.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <Link href="/account" className="hover:underline">
            Account
          </Link>
          <span aria-hidden="true"> / </span>
          Wishlist
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Wishlist</h1>
        <p className="text-sm text-muted-foreground">Products you saved for later.</p>
      </header>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Your wishlist is empty.{' '}
          <Link href="/search" className="underline">
            Browse products
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <Link
                  href={`/products/${encodeURIComponent(item.productId)}`}
                  className="font-medium hover:underline"
                >
                  Product {item.productId.slice(0, 8)}…
                </Link>
                <p className="text-xs text-muted-foreground">
                  Saved {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => void remove(item.productId)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
