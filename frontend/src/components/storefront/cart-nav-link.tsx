'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getOrCreateCart } from '@/lib/cart-api';

export function CartNavLink() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cart = await getOrCreateCart();
        if (!cancelled) {
          setCount(cart.lines.reduce((sum, line) => sum + line.quantity, 0));
        }
      } catch {
        if (!cancelled) {
          setCount(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link href="/cart" className="sf-action-link border border-border">
      Cart{count !== null && count > 0 ? ` (${count})` : ''}
    </Link>
  );
}
