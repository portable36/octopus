import { Inject, Injectable, Logger } from '@nestjs/common';
import { ORDER_PORT, type OrderPort } from '../../../../shared-kernel/application/ports/order.port';
import type { ReportingOutboxHandler } from '../../../../shared-kernel/application/ports/reporting-outbox-handler.port';
import {
  REPORTING_ORDER_FACT_REPOSITORY,
  type ReportingOrderFactRepository,
} from '../ports/reporting-order-fact-repository.interface';

@Injectable()
export class ReportingProjectionService implements ReportingOutboxHandler {
  private readonly logger = new Logger(ReportingProjectionService.name);

  constructor(
    @Inject(ORDER_PORT) private readonly orders: OrderPort,
    @Inject(REPORTING_ORDER_FACT_REPOSITORY)
    private readonly facts: ReportingOrderFactRepository,
  ) {}

  public async handle(eventType: string, payload: Record<string, unknown>): Promise<void> {
    if (eventType !== 'OrderCreated' && eventType !== 'OrderPaid') {
      return;
    }
    const orderId = String(payload['orderId'] ?? '');
    if (!orderId) {
      this.logger.warn(`Reporting ${eventType} missing orderId; skip.`);
      return;
    }

    const [fulfillment, finance, notification] = await Promise.all([
      this.orders.getFulfillmentSnapshot(orderId),
      this.orders.getFinanceSnapshot(orderId),
      this.orders.getNotificationSnapshot(orderId),
    ]);
    if (!fulfillment || !finance) {
      this.logger.warn(`Reporting order ${orderId} not found; skip.`);
      return;
    }

    const now = new Date();
    const paidAt = fulfillment.paymentStatus === 'PAID' ? now : null;

    await this.facts.upsert({
      orderId,
      vendorId: fulfillment.vendorId,
      storeId: fulfillment.storeId,
      customerId: notification?.customerId ?? null,
      currencyCode: fulfillment.currencyCode,
      totalMinor: finance.totalMinor,
      commissionMinor: finance.commissionMinor,
      status: fulfillment.status,
      paymentStatus: fulfillment.paymentStatus,
      paymentMethod: fulfillment.paymentMethod,
      createdAt: now,
      paidAt,
      updatedAt: now,
    });
  }
}
