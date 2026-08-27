export const REPORTING_OUTBOX_HANDLER = Symbol('REPORTING_OUTBOX_HANDLER');

/** Messaging → Reporting seam (OrderCreated / OrderPaid). */
export interface ReportingOutboxHandler {
  handle(eventType: string, payload: Record<string, unknown>): Promise<void>;
}
