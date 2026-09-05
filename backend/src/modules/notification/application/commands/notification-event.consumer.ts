import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  NOTIFICATION_PORT,
  type NotificationPort,
} from '../../../../shared-kernel/application/ports/notification.port';
import type { NotificationOutboxHandler } from '../../../../shared-kernel/application/ports/notification-outbox-handler.port';
import { ORDER_PORT, type OrderPort } from '../../../../shared-kernel/application/ports/order.port';
import {
  USER_CONTACT_PORT,
  type UserContactPort,
} from '../../../../shared-kernel/application/ports/user-contact.port';

function amountLabel(minor: number, currencyCode: string): string {
  const major = (minor / 100).toFixed(2);
  return `${currencyCode} ${major}`;
}

/**
 * Maps outboxed commerce events → NOTIFICATION_PORT (no domain business rules).
 */
@Injectable()
export class NotificationEventConsumer implements NotificationOutboxHandler {
  private readonly logger = new Logger(NotificationEventConsumer.name);

  constructor(
    @Inject(NOTIFICATION_PORT) private readonly notifications: NotificationPort,
    @Inject(ORDER_PORT) private readonly orders: OrderPort,
    @Inject(USER_CONTACT_PORT) private readonly contacts: UserContactPort,
  ) {}

  public async handle(eventType: string, payload: Record<string, unknown>): Promise<void> {
    if (eventType === 'CodCollected') {
      await this.notifyForOrder(payload, {
        type: 'payment.cod_collected',
        templateKey: 'payment.cod_collected',
        eventIdPrefix: 'notify:cod',
      });
      return;
    }
    if (eventType === 'RefundCompleted') {
      const allocation =
        payload['allocation'] && typeof payload['allocation'] === 'object'
          ? (payload['allocation'] as Record<string, unknown>)
          : payload;
      await this.notifyForOrder(allocation, {
        type: 'payment.refund_completed',
        templateKey: 'payment.refund_completed',
        eventIdPrefix: 'notify:refund',
      });
      return;
    }
    if (eventType === 'ShipmentDelivered') {
      await this.notifyForOrder(payload, {
        type: 'fulfillment.shipment_delivered',
        templateKey: 'fulfillment.shipment_delivered',
        eventIdPrefix: 'notify:ship_delivered',
      });
      return;
    }
    if (eventType === 'CartAbandonedEvent') {
      await this.notifyCartAbandoned(payload);
    }
  }

  private async notifyCartAbandoned(payload: Record<string, unknown>): Promise<void> {
    const cartId = String(payload['cartId'] ?? '');
    const customerId = payload['customerId'] == null ? null : String(payload['customerId']);
    if (!cartId || !customerId) {
      this.logger.debug(
        `CartAbandonedEvent ${cartId || 'unknown'} has no customer; skip notification.`,
      );
      return;
    }

    const email = await this.contacts.findEmailByUserId(customerId);
    const couponCode = String(payload['couponCode'] ?? '');
    await this.notifications.notify({
      eventId: `cart-abandoned:${cartId}`,
      recipientUserId: customerId,
      recipientEmail: email,
      type: 'cart.abandoned_recovery',
      templateKey: 'cart.abandoned_recovery',
      category: 'MARKETING',
      channels: ['EMAIL'],
      data: {
        cartId,
        couponCode,
        couponExpiresAt: String(payload['couponExpiresAt'] ?? ''),
        currencyCode: String(payload['currencyCode'] ?? ''),
        subtotalMinor: String(payload['subtotalMinor'] ?? '0'),
      },
    });
  }

  private async notifyForOrder(
    payload: Record<string, unknown>,
    meta: {
      readonly type: string;
      readonly templateKey: string;
      readonly eventIdPrefix: string;
    },
  ): Promise<void> {
    const orderId = String(payload['orderId'] ?? '');
    if (!orderId) {
      this.logger.warn(`${meta.type} missing orderId; skip notification.`);
      return;
    }
    const snapshot = await this.orders.getNotificationSnapshot(orderId);
    if (!snapshot?.customerId) {
      this.logger.debug(`${meta.type} order ${orderId} has no customer; skip notification.`);
      return;
    }
    const email = await this.contacts.findEmailByUserId(snapshot.customerId);
    const amountMinor =
      payload['amountMinor'] != null ? Number(payload['amountMinor']) : snapshot.totalMinor;
    const currencyCode = String(payload['currencyCode'] ?? snapshot.currencyCode);
    const refundId = payload['refundId'] != null ? String(payload['refundId']) : null;
    const shipmentId = payload['shipmentId'] != null ? String(payload['shipmentId']) : null;
    const eventId = refundId
      ? `${meta.eventIdPrefix}:${refundId}`
      : shipmentId
        ? `${meta.eventIdPrefix}:${shipmentId}`
        : `${meta.eventIdPrefix}:${orderId}`;

    await this.notifications.notify({
      eventId,
      recipientUserId: snapshot.customerId,
      recipientEmail: email,
      type: meta.type,
      templateKey: meta.templateKey,
      category: 'TRANSACTIONAL',
      channels: ['IN_APP', 'EMAIL'],
      data: {
        orderNumber: snapshot.orderNumber,
        amountLabel: amountLabel(
          Number.isFinite(amountMinor) ? amountMinor : snapshot.totalMinor,
          currencyCode,
        ),
      },
    });
  }
}
