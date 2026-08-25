import { Injectable } from '@nestjs/common';
import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type {
  DeliveryStatus,
  NotificationChannel,
  NotificationLocale,
  NotificationRecord,
  NotificationTemplate,
} from '../../domain/notification.types';
import type {
  CreateNotificationInput,
  NotificationPreferences,
  NotificationRepository,
} from '../../application/ports/notification-repository.interface';
import { NotificationDeliveryAttemptOrmEntity } from './notification-delivery-attempt.orm-entity';
import { NotificationOrmEntity } from './notification.orm-entity';
import { NotificationPreferenceOrmEntity } from './notification-preference.orm-entity';
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
