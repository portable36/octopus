import { randomBytes } from 'node:crypto';

export const ABANDONED_CART_JOB_PREFIX = 'abandoned-cart:';

export const ABANDONED_CART_CHECK_DELAY_MS = 30 * 60 * 1000;

export const ABANDONED_CART_COUPON_TTL_MS = 48 * 60 * 60 * 1000;

export const ABANDONED_CART_DISCOUNT_PERCENT = 10;

export function abandonedCartJobId(cartId: string): string {
  return `${ABANDONED_CART_JOB_PREFIX}${cartId}`;
}

export function generateRecoveryCouponCode(): string {
  return `SAVE-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export type CartAbandonedEventPayload = {
  readonly cartId: string;
  readonly customerId: string | null;
  readonly guestToken: string | null;
  readonly couponCode: string;
  readonly couponExpiresAt: string;
  readonly currencyCode: string;
  readonly subtotalMinor: number;
  readonly items: readonly {
    readonly productId: string;
    readonly variantId: string;
    readonly offerId: string;
    readonly quantity: number;
    readonly unitPriceSnapshotMinor: number;
  }[];
};
