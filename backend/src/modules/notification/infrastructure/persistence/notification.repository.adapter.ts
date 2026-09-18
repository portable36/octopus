import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type {
  DeliveryStatus,
  NotificationChannel,
  NotificationLocale,
  NotificationRecord,
  NotificationTemplate,
  PushDeviceRecord,
  PushPlatform,
} from '../../domain/notification.types';
import type {
  CreateNotificationInput,
  NotificationDeliveryAttempt,
  AdminNotificationListFilter,
  NotificationPreferences,
  NotificationRepository,
  UpsertPushDeviceInput,
} from '../../application/ports/notification-repository.interface';
import { NotificationDeliveryAttemptOrmEntity } from './notification-delivery-attempt.orm-entity';
import { NotificationOrmEntity } from './notification.orm-entity';
import { NotificationPreferenceOrmEntity } from './notification-preference.orm-entity';
import { NotificationPushDeviceOrmEntity } from './notification-push-device.orm-entity';
import { NotificationTemplateOrmEntity } from './notification-template.orm-entity';

@Injectable()
export class NotificationRepositoryAdapter implements NotificationRepository {
  constructor(private readonly em: EntityManager) {}

  public async findLatestTemplate(
    templateKey: string,
    channel: NotificationChannel,
    locale: NotificationLocale,
  ): Promise<NotificationTemplate | null> {
    return withRlsContext(this.em, async (tx) => {
      const row = await tx.findOne(
        NotificationTemplateOrmEntity,
        { templateKey, channel, locale },
        { orderBy: { version: 'desc' } },
      );
      return row ? mapTemplate(row) : null;
    });
  }

  public async listTemplates(): Promise<readonly NotificationTemplate[]> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(
        NotificationTemplateOrmEntity,
        {},
        { orderBy: { templateKey: 'asc', channel: 'asc', locale: 'asc', version: 'desc' } },
      );
      return rows.map(mapTemplate);
    });
  }

  public async findByIdempotency(
    eventId: string,
    recipientUserId: string,
    notificationType: string,
    channel: NotificationChannel,
  ): Promise<NotificationRecord | null> {
    return withRlsContext(this.em, async (tx) => {
      const row = await tx.findOne(NotificationOrmEntity, {
        eventId,
        recipientUserId,
        notificationType,
        channel,
      });
      return row ? mapNotification(row) : null;
    });
  }

  public async insertIgnoreConflict(input: CreateNotificationInput): Promise<NotificationRecord> {
    return withRlsContext(this.em, async (tx) => {
      const row = new NotificationOrmEntity();
      row.id = input.id;
      row.eventId = input.eventId;
      row.recipientUserId = input.recipientUserId;
      row.recipientEmail = input.recipientEmail;
      row.notificationType = input.notificationType;
      row.channel = input.channel;
      row.locale = input.locale;
      row.templateKey = input.templateKey;
      row.templateVersion = input.templateVersion;
      row.title = input.title;
      row.body = input.body;
      row.payloadJson = input.payload;
      row.deliveryStatus = input.deliveryStatus;
      row.readAt = null;
      row.createdAt = input.createdAt;
      try {
        await tx.persistAndFlush(row);
        return mapNotification(row);
      } catch (error) {
        if (!(error instanceof UniqueConstraintViolationException)) {
          throw error;
        }
        const existing = await tx.findOne(NotificationOrmEntity, {
          eventId: input.eventId,
          recipientUserId: input.recipientUserId,
          notificationType: input.notificationType,
          channel: input.channel,
        });
        if (!existing) {
          throw error;
        }
        return mapNotification(existing);
      }
    });
  }

  public async findById(id: string): Promise<NotificationRecord | null> {
    return withRlsContext(this.em, async (tx) => {
      const row = await tx.findOne(NotificationOrmEntity, { id });
      return row ? mapNotification(row) : null;
    });
  }

  public async listInAppForUser(
    userId: string,
    limit: number,
  ): Promise<{ readonly items: readonly NotificationRecord[]; readonly unreadCount: number }> {
    return withRlsContext(this.em, async (tx) => {
      const take = Math.min(100, Math.max(1, limit));
      const items = await tx.find(
        NotificationOrmEntity,
        { recipientUserId: userId, channel: 'IN_APP' },
        { orderBy: { createdAt: 'desc' }, limit: take },
      );
      const unreadCount = await tx.count(NotificationOrmEntity, {
        recipientUserId: userId,
        channel: 'IN_APP',
        readAt: null,
      });
      return { items: items.map(mapNotification), unreadCount };
    });
  }

  public async listRecentForAdmin(
    filter: AdminNotificationListFilter,
  ): Promise<readonly NotificationRecord[]> {
    return withRlsContext(this.em, async (tx) => {
      const take = Math.min(100, Math.max(1, filter.limit));
      const where: Record<string, unknown> = {};
      if (filter.channel) {
        where.channel = filter.channel;
      }
      if (filter.deliveryStatus) {
        where.deliveryStatus = filter.deliveryStatus;
      }
      if (filter.templateKey?.trim()) {
        where.templateKey = filter.templateKey.trim();
      }
      const items = await tx.find(NotificationOrmEntity, where, {
        orderBy: { createdAt: 'desc' },
        limit: take,
      });
      return items.map(mapNotification);
    });
  }

  public async listDeliveryAttempts(
    notificationId: string,
  ): Promise<readonly NotificationDeliveryAttempt[]> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(
        NotificationDeliveryAttemptOrmEntity,
        { notificationId },
        { orderBy: { attemptNumber: 'asc' } },
      );
      return rows.map(mapDeliveryAttempt);
    });
  }

  public async markRead(
    id: string,
    userId: string,
    readAt: Date,
  ): Promise<NotificationRecord | null> {
    return withRlsContext(this.em, async (tx) => {
      const row = await tx.findOne(NotificationOrmEntity, {
        id,
        recipientUserId: userId,
        channel: 'IN_APP',
      });
      if (!row) {
        return null;
      }
      if (!row.readAt) {
        row.readAt = readAt;
        await tx.flush();
      }
      return mapNotification(row);
    });
  }

  public async updateDeliveryStatus(id: string, status: DeliveryStatus): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const row = await tx.findOne(NotificationOrmEntity, { id });
      if (!row) {
        return;
      }
      row.deliveryStatus = status;
      await tx.flush();
    });
  }

  public async appendDeliveryAttempt(input: {
    readonly id: string;
    readonly notificationId: string;
    readonly channel: NotificationChannel;
    readonly attemptNumber: number;
    readonly status: 'SENT' | 'FAILED';
    readonly providerMessageId: string | null;
    readonly errorCode: string | null;
    readonly createdAt: Date;
  }): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const row = new NotificationDeliveryAttemptOrmEntity();
      row.id = input.id;
      row.notificationId = input.notificationId;
      row.channel = input.channel;
      row.attemptNumber = input.attemptNumber;
      row.status = input.status;
      row.providerMessageId = input.providerMessageId;
      row.errorCode = input.errorCode;
      row.createdAt = input.createdAt;
      await tx.persistAndFlush(row);
    });
  }

  public async countDeliveryAttempts(notificationId: string): Promise<number> {
    return withRlsContext(this.em, async (tx) => {
      return tx.count(NotificationDeliveryAttemptOrmEntity, { notificationId });
    });
  }

  public async getPreferences(userId: string): Promise<NotificationPreferences> {
    return withRlsContext(this.em, async (tx) => {
      const row = await tx.findOne(NotificationPreferenceOrmEntity, { userId });
      return {
        userId,
        marketingEmail: row?.marketingEmail ?? false,
        marketingInApp: row?.marketingInApp ?? false,
      };
    });
  }

  public async upsertPreferences(
    userId: string,
    patch: { readonly marketingEmail?: boolean; readonly marketingInApp?: boolean },
  ): Promise<NotificationPreferences> {
    return withRlsContext(this.em, async (tx) => {
      let row = await tx.findOne(NotificationPreferenceOrmEntity, { userId });
      if (!row) {
        row = new NotificationPreferenceOrmEntity();
        row.userId = userId;
        row.marketingEmail = false;
        row.marketingInApp = false;
        row.updatedAt = new Date();
        tx.persist(row);
      }
      if (patch.marketingEmail !== undefined) {
        row.marketingEmail = patch.marketingEmail;
      }
      if (patch.marketingInApp !== undefined) {
        row.marketingInApp = patch.marketingInApp;
      }
      row.updatedAt = new Date();
      await tx.flush();
      return {
        userId,
        marketingEmail: row.marketingEmail,
        marketingInApp: row.marketingInApp,
      };
    });
  }

  public async upsertPushDevice(input: UpsertPushDeviceInput): Promise<PushDeviceRecord> {
    const fingerprint = fingerprintToken(input.token);
    const now = new Date();
    return withRlsContext(this.em, async (tx) => {
      let row = await tx.findOne(NotificationPushDeviceOrmEntity, {
        userId: input.userId,
        tokenFingerprint: fingerprint,
      });
      if (row) {
        row.token = input.token;
        row.platform = input.platform;
        row.label = input.label?.trim() ? input.label.trim() : row.label;
        row.lastSeenAt = now;
        row.revokedAt = null;
        await tx.flush();
        return mapPushDevice(row);
      }

      row = new NotificationPushDeviceOrmEntity();
      row.id = UniqueID.create().value;
      row.userId = input.userId;
      row.platform = input.platform;
      row.token = input.token;
      row.tokenFingerprint = fingerprint;
      row.label = input.label?.trim() ? input.label.trim() : null;
      row.lastSeenAt = now;
      row.createdAt = now;
      row.revokedAt = null;
      await tx.persistAndFlush(row);
      return mapPushDevice(row);
    });
  }

  public async listActivePushDevices(userId: string): Promise<readonly PushDeviceRecord[]> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(
        NotificationPushDeviceOrmEntity,
        { userId, revokedAt: null },
        { orderBy: { lastSeenAt: 'desc' } },
      );
      return rows.map(mapPushDevice);
    });
  }

  public async revokePushDevice(userId: string, deviceId: string): Promise<boolean> {
    return withRlsContext(this.em, async (tx) => {
      const row = await tx.findOne(NotificationPushDeviceOrmEntity, { id: deviceId, userId });
      if (!row || row.revokedAt) {
        return false;
      }
      row.revokedAt = new Date();
      await tx.flush();
      return true;
    });
  }
}

function fingerprintToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function mapPushDevice(row: NotificationPushDeviceOrmEntity): PushDeviceRecord {
  return {
    id: row.id,
    userId: row.userId,
    platform: row.platform as PushPlatform,
    token: row.token,
    tokenFingerprint: row.tokenFingerprint,
    label: row.label,
    lastSeenAt: row.lastSeenAt,
    createdAt: row.createdAt,
    revokedAt: row.revokedAt,
  };
}

function mapTemplate(row: NotificationTemplateOrmEntity): NotificationTemplate {
  return {
    id: row.id,
    templateKey: row.templateKey,
    channel: row.channel as NotificationChannel,
    locale: row.locale as NotificationLocale,
    version: row.version,
    subject: row.subject,
    bodyText: row.bodyText,
  };
}

function mapDeliveryAttempt(
  row: NotificationDeliveryAttemptOrmEntity,
): NotificationDeliveryAttempt {
  return {
    id: row.id,
    notificationId: row.notificationId,
    channel: row.channel as NotificationChannel,
    attemptNumber: row.attemptNumber,
    status: row.status as 'SENT' | 'FAILED',
    providerMessageId: row.providerMessageId,
    errorCode: row.errorCode,
    createdAt: row.createdAt,
  };
}

function mapNotification(row: NotificationOrmEntity): NotificationRecord {
  return {
    id: row.id,
    eventId: row.eventId,
    recipientUserId: row.recipientUserId,
    recipientEmail: row.recipientEmail,
    notificationType: row.notificationType,
    channel: row.channel as NotificationChannel,
    locale: row.locale as NotificationLocale,
    templateKey: row.templateKey,
    templateVersion: row.templateVersion,
    title: row.title,
    body: row.body,
    payload: row.payloadJson ?? {},
    deliveryStatus: row.deliveryStatus as DeliveryStatus,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}
