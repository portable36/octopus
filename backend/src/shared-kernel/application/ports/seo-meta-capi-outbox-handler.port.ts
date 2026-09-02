export const SEO_META_CAPI_OUTBOX_HANDLER = Symbol('SEO_META_CAPI_OUTBOX_HANDLER');

/** Messaging → SEO discovery Meta CAPI enqueue seam (OrderCreated / OrderPaid / CodCollected). */
export interface SeoMetaCapiOutboxHandler {
  handle(eventType: string, payload: Record<string, unknown>): Promise<void>;
}
