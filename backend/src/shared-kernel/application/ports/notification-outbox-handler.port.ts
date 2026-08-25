export const NOTIFICATION_OUTBOX_HANDLER = Symbol('NOTIFICATION_OUTBOX_HANDLER');

/** Messaging → Notification seam (no cross-module class imports). */
export interface NotificationOutboxHandler {
  handle(eventType: string, payload: Record<string, unknown>): Promise<void>;
}
