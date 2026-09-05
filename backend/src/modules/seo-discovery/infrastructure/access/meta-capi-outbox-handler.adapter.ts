import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ORDER_PORT, type OrderPort } from '../../../../shared-kernel/application/ports/order.port';
import {
  USER_CONTACT_PORT,
  type UserContactPort,
} from '../../../../shared-kernel/application/ports/user-contact.port';
import type { SeoMetaCapiOutboxHandler } from '../../../../shared-kernel/application/ports/seo-meta-capi-outbox-handler.port';
import { AppConfigService } from '../../../../config/app-config.service';
import { SeoDiscoveryEnqueuerService } from '../../jobs/seo-discovery-enqueuer.service';
import type { MetaCapiUserDataInput } from '../services/meta-capi.types';

function minorToMajor(minor: number): number {
  return Number((minor / 100).toFixed(2));
}

function readString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

@Injectable()
export class MetaCapiOutboxHandlerAdapter implements SeoMetaCapiOutboxHandler {
  private readonly logger = new Logger(MetaCapiOutboxHandlerAdapter.name);

  constructor(
    @Inject(AppConfigService) private readonly config: AppConfigService,
    @Inject(forwardRef(() => SeoDiscoveryEnqueuerService))
    private readonly enqueuer: SeoDiscoveryEnqueuerService,
    @Inject(ORDER_PORT) private readonly orders: OrderPort,
    @Inject(USER_CONTACT_PORT) private readonly contacts: UserContactPort,
  ) {}

  public async handle(eventType: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.config.metaPixelId || !this.config.metaAccessToken) {
      return;
    }

    if (eventType === 'OrderCreated') {
      await this.enqueueCheckoutEvent('InitiateCheckout', payload, { authoritativeForCod: false });
      return;
    }
    if (eventType === 'OrderPaid') {
      await this.enqueueCheckoutEvent('Purchase', payload, { authoritativeForCod: false });
      return;
    }
    if (eventType === 'CodCollected') {
      await this.enqueueCheckoutEvent('Purchase', payload, { authoritativeForCod: true });
    }
  }

  private async enqueueCheckoutEvent(
    eventName: 'InitiateCheckout' | 'Purchase',
    payload: Record<string, unknown>,
    options: { readonly authoritativeForCod: boolean },
  ): Promise<void> {
    const orderId = String(payload['orderId'] ?? '');
    if (!orderId) {
      this.logger.warn(`Meta CAPI ${eventName} missing orderId; skip enqueue.`);
      return;
    }

    const [finance, fulfillment, notification] = await Promise.all([
      this.orders.getFinanceSnapshot(orderId),
      this.orders.getFulfillmentSnapshot(orderId),
      this.orders.getNotificationSnapshot(orderId),
    ]);

    if (!finance || !fulfillment) {
      this.logger.warn(`Meta CAPI ${eventName} order ${orderId} not found; skip enqueue.`);
      return;
    }

    const isCod = finance.paymentMethod === 'COD' || fulfillment.paymentMethod === 'COD';
    if (eventName === 'Purchase') {
      if (isCod && !options.authoritativeForCod) {
        return;
      }
      if (!isCod && options.authoritativeForCod) {
        return;
      }
    }

    const orderNumber = fulfillment.orderNumber || orderId;
    const email =
      notification?.customerId != null
        ? await this.contacts.findEmailByUserId(notification.customerId)
        : null;

    const userData: MetaCapiUserDataInput = {
      email,
      ...((readString(payload, 'phone') ?? readString(payload, 'customerPhone'))
        ? { phone: readString(payload, 'phone') ?? readString(payload, 'customerPhone') ?? null }
        : {}),
      ...((readString(payload, 'clientIpAddress') ?? readString(payload, 'client_ip_address'))
        ? {
            clientIpAddress:
              readString(payload, 'clientIpAddress') ??
              readString(payload, 'client_ip_address') ??
              null,
          }
        : {}),
      ...((readString(payload, 'clientUserAgent') ?? readString(payload, 'client_user_agent'))
        ? {
            clientUserAgent:
              readString(payload, 'clientUserAgent') ??
              readString(payload, 'client_user_agent') ??
              null,
          }
        : {}),
    };

    await this.enqueuer.enqueueMetaCapiEvent({
      eventName,
      eventTime: Math.floor(Date.now() / 1000),
      eventId: `${eventName.toLowerCase()}:${orderNumber}`,
      userData,
      customData: {
        value: minorToMajor(finance.totalMinor),
        currency: finance.currencyCode || fulfillment.currencyCode,
        orderId: orderNumber,
      },
    });
  }
}
