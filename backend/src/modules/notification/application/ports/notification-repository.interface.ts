import type {
  DeliveryStatus,
  NotificationChannel,
  NotificationLocale,
  NotificationRecord,
  NotificationTemplate,
} from '../../domain/notification.types';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export type CreateNotificationInput = {
  readonly id: string;
  readonly eventId: string;
  readonly recipientUserId: string;
  readonly recipientEmail: string | null;
  readonly notificationType: string;
  readonly channel: NotificationChannel;
  readonly locale: NotificationLocale;
  readonly templateKey: string;
  readonly templateVersion: number;
  readonly title: string;
  readonly body: string;
  readonly payload: Record<string, unknown>;
  readonly deliveryStatus: DeliveryStatus;
  readonly createdAt: Date;
};

export type NotificationPreferences = {
  readonly userId: string;
  readonly marketingEmail: boolean;
  readonly marketingInApp: boolean;
};

export interface NotificationRepository {
  findLatestTemplate(
    templateKey: string,
    channel: NotificationChannel,
    locale: NotificationLocale,
  ): Promise<NotificationTemplate | null>;
  findByIdempotency(
    eventId: string,
    recipientUserId: string,
    notificationType: string,
    channel: NotificationChannel,
  ): Promise<NotificationRecord | null>;
  insertIgnoreConflict(input: CreateNotificationInput): Promise<NotificationRecord>;
  findById(id: string): Promise<NotificationRecord | null>;
  listInAppForUser(
    userId: string,
    limit: number,
  ): Promise<{ readonly items: readonly NotificationRecord[]; readonly unreadCount: number }>;
  markRead(id: string, userId: string, readAt: Date): Promise<NotificationRecord | null>;
  updateDeliveryStatus(id: string, status: DeliveryStatus): Promise<void>;
  appendDeliveryAttempt(input: {
    readonly id: string;
    readonly notificationId: string;
    readonly channel: NotificationChannel;
    readonly attemptNumber: number;
    readonly status: 'SENT' | 'FAILED';
    readonly providerMessageId: string | null;
    readonly errorCode: string | null;
    readonly createdAt: Date;
  }): Promise<void>;
  countDeliveryAttempts(notificationId: string): Promise<number>;
  getPreferences(userId: string): Promise<NotificationPreferences>;
  upsertPreferences(
    userId: string,
    patch: { readonly marketingEmail?: boolean; readonly marketingInApp?: boolean },
  ): Promise<NotificationPreferences>;
}
