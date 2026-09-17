import type {
  DeliveryStatus,
  NotificationChannel,
  NotificationLocale,
  NotificationRecord,
  NotificationTemplate,
  PushDeviceRecord,
  PushPlatform,
} from '../../domain/notification.types';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export type CreateNotificationInput = {
  readonly id: string;
  readonly eventId: string;
  readonly recipientUserId: string;
  readonly recipientEmail: string | null;
  readonly recipientPhone?: string | null;
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

export type UpsertPushDeviceInput = {
  readonly userId: string;
  readonly platform: PushPlatform;
  readonly token: string;
  readonly label?: string | null;
};

export type NotificationDeliveryAttempt = {
  readonly id: string;
  readonly notificationId: string;
  readonly channel: NotificationChannel;
  readonly attemptNumber: number;
  readonly status: 'SENT' | 'FAILED';
  readonly providerMessageId: string | null;
  readonly errorCode: string | null;
  readonly createdAt: Date;
};

export type AdminNotificationListFilter = {
  readonly limit: number;
  readonly channel?: NotificationChannel;
  readonly deliveryStatus?: DeliveryStatus;
  readonly templateKey?: string;
};

export interface NotificationRepository {
  findLatestTemplate(
    templateKey: string,
    channel: NotificationChannel,
    locale: NotificationLocale,
  ): Promise<NotificationTemplate | null>;
  listTemplates(): Promise<readonly NotificationTemplate[]>;
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
  listRecentForAdmin(
    filter: AdminNotificationListFilter,
  ): Promise<readonly NotificationRecord[]>;
  listDeliveryAttempts(notificationId: string): Promise<readonly NotificationDeliveryAttempt[]>;
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
  upsertPushDevice(input: UpsertPushDeviceInput): Promise<PushDeviceRecord>;
  listActivePushDevices(userId: string): Promise<readonly PushDeviceRecord[]>;
  revokePushDevice(userId: string, deviceId: string): Promise<boolean>;
}
