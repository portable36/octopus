import type { CartAbandonedEventPayload } from '../abandoned-cart.types';

export const CART_ABANDONED_OUTBOX_PUBLISHER = Symbol('CART_ABANDONED_OUTBOX_PUBLISHER');

export interface CartAbandonedOutboxPublisherPort {
  publish(cartId: string, payload: CartAbandonedEventPayload): Promise<void>;
}
