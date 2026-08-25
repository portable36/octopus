export const NOTIFICATION_PORT = Symbol('NOTIFICATION_PORT');

export type NotificationChannel = 'EMAIL' | 'IN_APP';
export type NotificationLocale = 'en' | 'bn';
/** SECURITY/TRANSACTIONAL ignore marketing prefs; MARKETING is gated. */
export type NotificationCategory = 'SECURITY' | 'TRANSACTIONAL' | 'MARKETING';

export type NotifyCommand = {
  readonly eventId: string;
  readonly recipientUserId: string;
  readonly recipientEmail?: string | null;
  readonly type: string;
  readonly templateKey: string;
  readonly category: NotificationCategory;
  readonly channels: readonly NotificationChannel[];
  readonly locale?: NotificationLocale;
  readonly data?: Record<string, string>;
};

export type NotifyResult = {
  readonly notificationIds: readonly string[];
  readonly created: boolean;
};

export interface NotificationPort {
  /** Idempotent fan-out: one row per (eventId, recipient, type, channel). */
  notify(command: NotifyCommand): Promise<NotifyResult>;
  /** Async channel worker entry (EMAIL today). */
  processQueuedDelivery(notificationId: string): Promise<void>;
}
