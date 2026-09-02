export const ABANDONED_CART_OUTBOX_HANDLER = Symbol('ABANDONED_CART_OUTBOX_HANDLER');

/** Messaging → abandoned cart recovery seam (cancel jobs on purchase). */
export interface AbandonedCartOutboxHandler {
  handle(eventType: string, payload: Record<string, unknown>): Promise<void>;
}
