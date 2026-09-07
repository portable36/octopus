import { Inject, Injectable, Logger } from '@nestjs/common';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
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
    if (eventType === 'RefundCompleted') {
      await this.handleRefundCompleted(payload);
      return;
    }

    if (eventType !== 'OrderCreated' && eventType !== 'OrderPaid') {
      return;
    }
    const orderId = String(payload['orderId'] ?? '');
    if (!orderId) {
      this.logger.warn(`Reporting ${eventType} missing orderId; skip.`);
      return;
    }

    const [fulfillment, finance, notification, returnSnapshot] = await Promise.all([
      this.orders.getFulfillmentSnapshot(orderId),
      this.orders.getFinanceSnapshot(orderId),
      this.orders.getNotificationSnapshot(orderId),
      this.orders.getReturnSnapshot
        ? this.orders.getReturnSnapshot(orderId)
        : Promise.resolve(null),
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

    if (returnSnapshot && returnSnapshot.lines.length > 0) {
      const items = returnSnapshot.lines.map((line) => ({
        id: UniqueID.create().value,
        orderId,
        lineId: line.lineId,
        vendorId: fulfillment.vendorId,
        storeId: fulfillment.storeId,
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
        totalMinor: line.lineTotalMinor,
        currencyCode: line.currencyCode || fulfillment.currencyCode,
        paymentStatus: fulfillment.paymentStatus,
        createdAt: now,
        paidAt,
      }));
      await this.facts.upsertItemFacts(items);
    }
  }

  private async handleRefundCompleted(payload: Record<string, unknown>): Promise<void> {
    const refundId = String(payload['refundId'] ?? '');
    const orderId = String(payload['orderId'] ?? '');
    const vendorId = String(payload['vendorId'] ?? '');
    const storeId = String(payload['storeId'] ?? '');
    const amountMinor = Number(payload['amountMinor'] ?? 0);
    const currencyCode = String(payload['currencyCode'] ?? 'BDT');
    const paymentMethod = payload['method'] ? String(payload['method']) : null;
    const returnId = payload['returnId'] ? String(payload['returnId']) : null;

    if (!refundId || !orderId) {
      this.logger.warn('Reporting RefundCompleted missing refundId or orderId; skip.');
      return;
    }

    await this.facts.recordRefundFact({
      refundId,
      orderId,
      vendorId,
      storeId,
      returnId,
      amountMinor,
      currencyCode,
      paymentMethod,
      createdAt: new Date(),
    });
  }
}
