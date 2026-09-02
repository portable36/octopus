'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { pushToDataLayer, minorToMajor } from '@/infrastructure/analytics/dataLayer';
import { ApiClientError } from '@/lib/api-client';
import { addCartItem, getOrCreateCart } from '@/lib/cart-api';

type AnalyticsItem = {
  readonly productId: string;
  readonly productName: string;
  readonly sku: string;
  readonly priceMinor: number;
  readonly currencyCode: string;
  readonly brand?: string;
  readonly category?: string;
};

type Props = {
  readonly storeId: string;
  readonly variantId: string;
  readonly disabled?: boolean;
  readonly analytics?: AnalyticsItem;
};

export function AddToCartButton({ storeId, variantId, disabled, analytics }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAdd() {
    setPending(true);
    setError(null);
    try {
      const cart = await getOrCreateCart();
      await addCartItem({
        cartId: cart.id,
        storeId,
        variantId,
        quantity: 1,
      });

      if (analytics) {
        pushToDataLayer({
          event: 'add_to_cart',
          currency: analytics.currencyCode,
          value: minorToMajor(analytics.priceMinor),
          items: [
            {
              id: analytics.productId,
              name: analytics.productName,
              price: minorToMajor(analytics.priceMinor),
              sku: analytics.sku,
              ...(analytics.brand ? { brand: analytics.brand } : {}),
              ...(analytics.category ? { category: analytics.category } : {}),
              quantity: 1,
            },
          ],
        });
      }

      router.push('/cart');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not add to cart.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="sf-button-primary border-0"
        disabled={disabled || pending}
        onClick={() => void onAdd()}
      >
        {pending ? 'Adding…' : 'Add to cart'}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
