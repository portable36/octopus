import { Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import type {
  NotificationPort,
  NotifyCommand,
  NotifyResult,
} from '../../../../shared-kernel/application/ports/notification.port';
import {
  renderTemplate,
  type NotificationChannel,
  type NotificationLocale,
} from '../../domain/notification.types';
import { EMAIL_PROVIDER, type EmailProviderPort } from '../ports/email-provider.port';
import { SMS_PROVIDER, type SmsProviderPort } from '../ports/sms-provider.port';
import {
  NOTIFICATION_DELIVERY_ENQUEUER,
  type NotificationDeliveryEnqueuerPort,
} from '../ports/notification-delivery-enqueuer.port';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../ports/notification-repository.interface';

const BUILT_IN_FALLBACK_TEMPLATES: Record<string, { subject?: string; bodyText: string }> = {
  'fulfillment.shipment_shipped:EMAIL:en': {
    subject: 'Shipped — {{orderNumber}}',
    bodyText:
      'Your order {{orderNumber}} has shipped with {{courier}}. Tracking: {{trackingCode}}.',
  },
  'fulfillment.shipment_shipped:IN_APP:en': {
    bodyText: 'Order {{orderNumber}} shipped with {{courier}} (Tracking: {{trackingCode}}).',
  },
  'fulfillment.shipment_shipped:SMS:en': {
    bodyText:
      'Octopus: Order {{orderNumber}} shipped with {{courier}}. Tracking: {{trackingCode}}.',
  },
  'fulfillment.shipment_out_for_delivery:EMAIL:en': {
    subject: 'Out for delivery — {{orderNumber}}',
    bodyText: 'Your order {{orderNumber}} is out for delivery with {{courier}} today.',
  },
  'fulfillment.shipment_out_for_delivery:IN_APP:en': {
    bodyText: 'Order {{orderNumber}} is out for delivery today.',
  },
  'fulfillment.shipment_out_for_delivery:SMS:en': {
    bodyText: 'Octopus: Order {{orderNumber}} is out for delivery today.',
  },
  'fulfillment.shipment_delivered:SMS:en': {
    bodyText: 'Octopus: Order {{orderNumber}} has been delivered. Thank you!',
  },
  'payment.cod_collected:SMS:en': {
    bodyText: 'Octopus: Cash on delivery {{amountLabel}} collected for order {{orderNumber}}.',
  },
};

@Injectable()
export class NotificationHandlers implements NotificationPort {
  private readonly logger = new Logger(NotificationHandlers.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly repo: NotificationRepository,
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProviderPort,
    @Inject(NOTIFICATION_DELIVERY_ENQUEUER)
    private readonly enqueuer: NotificationDeliveryEnqueuerPort,
    @Optional() @Inject(SMS_PROVIDER) private readonly sms?: SmsProviderPort,
  ) {}

  public async notify(command: NotifyCommand): Promise<NotifyResult> {
    const locale: NotificationLocale = command.locale ?? 'en';
    const data = command.data ?? {};
    const ids: string[] = [];
    let createdAny = false;

    const channels = await this.filterChannelsByPreference(command);
    if (channels.length === 0) {
      return { notificationIds: [], created: false };
    }

    for (const channel of channels) {
      const existing = await this.repo.findByIdempotency(
        command.eventId,
        command.recipientUserId,
        command.type,
        channel,
      );
      if (existing) {
        ids.push(existing.id);
        continue;
      }

      let template = await this.repo.findLatestTemplate(command.templateKey, channel, locale);
      if (!template) {
        const fallback = BUILT_IN_FALLBACK_TEMPLATES[`${command.templateKey}:${channel}:${locale}`];
        if (fallback) {
          template = {
            id: `builtin:${command.templateKey}:${channel}:${locale}`,
            templateKey: command.templateKey,
            channel,
            locale,
            version: 1,
            subject: fallback.subject ?? null,
            bodyText: fallback.bodyText,
          };
        } else {
          this.logger.warn(
            `Missing template ${command.templateKey}/${channel}/${locale}; skipping channel.`,
          );
          continue;
        }
      }

      const body = renderTemplate(template.bodyText, data);
      const title =
        channel === 'EMAIL'
          ? renderTemplate(template.subject ?? command.templateKey, data)
          : body.slice(0, 120);

      const id = UniqueID.create().value;
      const record = await this.repo.insertIgnoreConflict({
        id,
        eventId: command.eventId,
        recipientUserId: command.recipientUserId,
        recipientEmail: command.recipientEmail ?? null,
        notificationType: command.type,
        channel,
        locale,
        templateKey: template.templateKey,
        templateVersion: template.version,
        title,
        body,
        payload: { ...data },
        deliveryStatus: channel === 'IN_APP' ? 'SENT' : 'PENDING',
        createdAt: new Date(),
      });
      ids.push(record.id);
      if (record.id === id) {
        createdAny = true;
        if (channel === 'IN_APP') {
          await this.repo.appendDeliveryAttempt({
            id: UniqueID.create().value,
            notificationId: record.id,
            channel: 'IN_APP',
            attemptNumber: 1,
            status: 'SENT',
            providerMessageId: null,
            errorCode: null,
            createdAt: new Date(),
          });
        }
        if (channel === 'EMAIL') {
          await this.enqueuer.enqueueEmailDelivery(record.id);
        }
        if (channel === 'SMS') {
          const phone = command.recipientPhone;
          if (phone && this.sms) {
            try {
              const res = await this.sms.send({
                to: phone,
                message: body,
                notificationId: record.id,
              });
              await this.repo.appendDeliveryAttempt({
                id: UniqueID.create().value,
                notificationId: record.id,
                channel: 'SMS',
                attemptNumber: 1,
                status: 'SENT',
                providerMessageId: res.providerMessageId,
                errorCode: null,
                createdAt: new Date(),
              });
              await this.repo.updateDeliveryStatus(record.id, 'SENT');
            } catch (err) {
              const code = err instanceof Error ? err.name : 'SMS_SEND_FAILED';
              await this.failDelivery(record.id, 'SMS', code.slice(0, 64));
            }
          } else {
            await this.failDelivery(record.id, 'SMS', 'MISSING_RECIPIENT_PHONE');
          }
        }
      }
    }

    return { notificationIds: ids, created: createdAny };
  }

  public async processQueuedDelivery(notificationId: string): Promise<void> {
    const record = await this.repo.findById(notificationId);
    if (!record) {
      this.logger.warn(`Notification ${notificationId} missing; skip delivery.`);
      return;
    }
    if (record.channel !== 'EMAIL') {
      return;
    }
    if (record.deliveryStatus === 'SENT') {
      return;
    }
    if (!record.recipientEmail) {
      await this.failDelivery(record.id, record.channel, 'MISSING_RECIPIENT_EMAIL');
      return;
    }

    try {
      const result = await this.email.send({
        to: record.recipientEmail,
        subject: record.title,
        bodyText: record.body,
        notificationId: record.id,
      });
      const attemptNumber = (await this.repo.countDeliveryAttempts(record.id)) + 1;
      await this.repo.appendDeliveryAttempt({
        id: UniqueID.create().value,
        notificationId: record.id,
        channel: 'EMAIL',
        attemptNumber,
        status: 'SENT',
        providerMessageId: result.providerMessageId,
        errorCode: null,
        createdAt: new Date(),
      });
      await this.repo.updateDeliveryStatus(record.id, 'SENT');
    } catch (error) {
      const code = error instanceof Error ? error.name : 'EMAIL_SEND_FAILED';
      await this.failDelivery(record.id, record.channel, code.slice(0, 64));
      throw error;
    }
  }

  public async listForUser(userId: string, limit = 50) {
    return this.repo.listInAppForUser(userId, limit);
  }

  public async markRead(userId: string, notificationId: string) {
    const updated = await this.repo.markRead(notificationId, userId, new Date());
    if (!updated) {
      throw new NotFoundException({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'Notification not found.',
        code: 'NOTIFICATION_NOT_FOUND',
      });
    }
    return updated;
  }

  public async getPreferences(userId: string) {
    return this.repo.getPreferences(userId);
  }

  public async updatePreferences(
    userId: string,
    patch: { readonly marketingEmail?: boolean; readonly marketingInApp?: boolean },
  ) {
    return this.repo.upsertPreferences(userId, patch);
  }

  private async filterChannelsByPreference(
    command: NotifyCommand,
  ): Promise<readonly NotificationChannel[]> {
    if (command.category !== 'MARKETING') {
      return command.channels;
    }
    const prefs = await this.repo.getPreferences(command.recipientUserId);
    return command.channels.filter((channel) => {
      if (channel === 'EMAIL') {
        return prefs.marketingEmail;
      }
      if (channel === 'IN_APP') {
        return prefs.marketingInApp;
      }
      return false;
    });
  }

  private async failDelivery(
    notificationId: string,
    channel: NotificationChannel,
    errorCode: string,
  ): Promise<void> {
    const attemptNumber = (await this.repo.countDeliveryAttempts(notificationId)) + 1;
    await this.repo.appendDeliveryAttempt({
      id: UniqueID.create().value,
      notificationId,
      channel,
      attemptNumber,
      status: 'FAILED',
      providerMessageId: null,
      errorCode,
      createdAt: new Date(),
    });
    await this.repo.updateDeliveryStatus(notificationId, 'FAILED');
  }
}
