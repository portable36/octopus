'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { addCartItem, getOrCreateCart } from '@/lib/cart-api';

type Props = {
  readonly storeId: string;
  readonly variantId: string;
  readonly disabled?: boolean;
};

export function AddToCartButton({ storeId, variantId, disabled }: Props) {
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
      <Button type="button" disabled={disabled || pending} onClick={() => void onAdd()}>
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
