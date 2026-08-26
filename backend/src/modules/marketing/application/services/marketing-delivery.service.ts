import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MARKETING_SETTINGS_PORT,
  type MarketingSettingsPort,
} from '../../../../shared-kernel/application/ports/marketing-settings.port';
import { ORDER_PORT, type OrderPort } from '../../../../shared-kernel/application/ports/order.port';
import { GA4_MP_PORT, type Ga4MpPort } from '../ports/ga4-mp.port';
import {
  MARKETING_EVENT_RECORDER,
  type MarketingEventRecorder,
} from '../ports/marketing-event-recorder.port';
import { META_CAPI_PORT, type MetaCapiPort } from '../ports/meta-capi.port';

/**
 * Server-side purchase/refund delivery rules.
 * COD: OrderPaid is skipped; authoritative purchase on CodCollected only.
 */
@Injectable()
export class MarketingDeliveryService {
  private readonly logger = new Logger(MarketingDeliveryService.name);

  constructor(
    @Inject(ORDER_PORT) private readonly orders: OrderPort,
    @Inject(GA4_MP_PORT) private readonly ga4: Ga4MpPort,
    @Inject(META_CAPI_PORT) private readonly meta: MetaCapiPort,
    @Inject(MARKETING_EVENT_RECORDER) private readonly events: MarketingEventRecorder,
    @Inject(MARKETING_SETTINGS_PORT) private readonly marketingSettings: MarketingSettingsPort,
  ) {}

  public async handle(eventType: string, payload: Record<string, unknown>): Promise<void> {
    if (eventType === 'OrderCreated') {
      return;
    }
    if (eventType === 'OrderPaid') {
      await this.handlePurchase(payload, { authoritativeForCod: false });
      return;
    }
    if (eventType === 'CodCollected') {
      await this.handlePurchase(payload, { authoritativeForCod: true });
      return;
    }
    if (eventType === 'RefundCompleted') {
      await this.handleRefund(payload);
    }
  }

  private async handlePurchase(
    payload: Record<string, unknown>,
    options: { readonly authoritativeForCod: boolean },
  ): Promise<void> {
    const orderId = String(payload['orderId'] ?? '');
    if (!orderId) {
      this.logger.warn('Marketing purchase missing orderId; skip.');
      return;
    }

    const [finance, fulfillment] = await Promise.all([
      this.orders.getFinanceSnapshot(orderId),
      this.orders.getFulfillmentSnapshot(orderId),
    ]);
    if (!finance || !fulfillment) {
      this.logger.warn(`Marketing purchase order ${orderId} not found; skip.`);
      return;
    }

    const isCod = finance.paymentMethod === 'COD' || fulfillment.paymentMethod === 'COD';
    if (isCod && !options.authoritativeForCod) {
      return;
    }
    if (!isCod && options.authoritativeForCod) {
      return;
    }

    const transactionId = fulfillment.orderNumber || orderId;
    const eventId = transactionId;
    const items = fulfillment.lines.map((line) => ({
      // ponytail: use variant SKU when Order line stores sku
      itemId: line.variantId,
      quantity: line.quantity,
      priceMinor: 0,
    }));

    const purchase = {
      eventId,
      transactionId,
      orderId,
      currencyCode: finance.currencyCode || fulfillment.currencyCode,
      valueMinor: finance.totalMinor,
      items,
    };

    const cfg = await this.marketingSettings.getRuntime();
    if (!cfg.enabled) {
      await this.events.record({
        eventName: 'purchase',
        channel: 'audit',
        transactionId,
        eventId: `audit:${eventId}`,
        orderId,
        status: 'SKIPPED',
        detail: 'marketing disabled',
      });
      return;
    }

    const [ga4, meta] = await Promise.all([
      this.ga4.sendPurchase(purchase),
      this.meta.sendPurchase(purchase),
    ]);
    await Promise.all([
      this.events.record({
        eventName: 'purchase',
        channel: 'ga4_mp',
        transactionId,
        eventId,
        orderId,
        status: ga4.status,
        detail: ga4.detail,
      }),
      this.events.record({
        eventName: 'purchase',
        channel: 'meta_capi',
        transactionId,
        eventId,
        orderId,
        status: meta.status,
        detail: meta.detail,
      }),
    ]);
  }

  private async handleRefund(payload: Record<string, unknown>): Promise<void> {
    const allocation =
      payload['allocation'] && typeof payload['allocation'] === 'object'
        ? (payload['allocation'] as Record<string, unknown>)
        : payload;
    const orderId = String(allocation['orderId'] ?? payload['orderId'] ?? '');
    if (!orderId) {
      this.logger.warn('Marketing refund missing orderId; skip.');
      return;
    }

    const fulfillment = await this.orders.getFulfillmentSnapshot(orderId);
    const finance = await this.orders.getFinanceSnapshot(orderId);
    const transactionId = fulfillment?.orderNumber || orderId;
    const refundId = String(allocation['refundId'] ?? '');
    const eventId = refundId ? `refund:${refundId}` : `refund:${transactionId}`;
    const valueMinor =
      allocation['amountMinor'] != null && Number.isInteger(Number(allocation['amountMinor']))
        ? Number(allocation['amountMinor'])
        : (finance?.totalMinor ?? fulfillment?.totalMinor ?? 0);
    const currencyCode = String(
      allocation['currencyCode'] ?? finance?.currencyCode ?? fulfillment?.currencyCode ?? 'BDT',
    );

    const refund = {
      eventId,
      transactionId,
      orderId,
      currencyCode,
      valueMinor,
    };

    const cfg = await this.marketingSettings.getRuntime();
    if (!cfg.enabled) {
      await this.events.record({
        eventName: 'refund',
        channel: 'audit',
        transactionId,
        eventId: `audit:${eventId}`,
        orderId,
        status: 'SKIPPED',
        detail: 'marketing disabled',
      });
      return;
    }

    const [ga4, meta] = await Promise.all([
      this.ga4.sendRefund(refund),
      this.meta.sendRefund(refund),
    ]);
    await Promise.all([
      this.events.record({
        eventName: 'refund',
        channel: 'ga4_mp',
        transactionId,
        eventId,
        orderId,
        status: ga4.status,
        detail: ga4.detail,
      }),
      this.events.record({
        eventName: 'refund',
        channel: 'meta_capi',
        transactionId,
        eventId,
        orderId,
        status: meta.status,
        detail: meta.detail,
      }),
    ]);
  }
}
