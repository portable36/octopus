export const MARKETING_OUTBOX_HANDLER = Symbol('MARKETING_OUTBOX_HANDLER');

/** Messaging → Marketing seam (CodCollected / RefundCompleted). */
export interface MarketingOutboxHandler {
  handle(eventType: string, payload: Record<string, unknown>): Promise<void>;
}
