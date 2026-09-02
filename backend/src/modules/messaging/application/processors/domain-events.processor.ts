import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import {
  ABANDONED_CART_OUTBOX_HANDLER,
  type AbandonedCartOutboxHandler,
} from '../../../../shared-kernel/application/ports/abandoned-cart-outbox-handler.port';
import {
  LEDGER_PORT,
  type LedgerPort,
  type LedgerRefundAllocation,
} from '../../../../shared-kernel/application/ports/ledger.port';
import {
  MARKETING_OUTBOX_HANDLER,
  type MarketingOutboxHandler,
} from '../../../../shared-kernel/application/ports/marketing-outbox-handler.port';
import {
  NOTIFICATION_OUTBOX_HANDLER,
  type NotificationOutboxHandler,
} from '../../../../shared-kernel/application/ports/notification-outbox-handler.port';
import {
  SEO_META_CAPI_OUTBOX_HANDLER,
  type SeoMetaCapiOutboxHandler,
} from '../../../../shared-kernel/application/ports/seo-meta-capi-outbox-handler.port';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';
import type { OutboxJobPayload } from '../../domain/outbox.types';
import { runOutboxDelivery } from '../outbox-delivery';

/**
 * Idempotent domain-event consumer.
 * Phase 15: CodCollected / RefundCompleted → ledger.
 * Phase 17.2: outbox events → NotificationOutboxHandler.
 * Phase 18.6: outbox events → MarketingOutboxHandler (CodCollected / RefundCompleted).
 */
@Injectable()
export class DomainEventsProcessor {
  private readonly logger = new Logger(DomainEventsProcessor.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(LEDGER_PORT) private readonly ledger: LedgerPort,
    @Inject(NOTIFICATION_OUTBOX_HANDLER)
    private readonly notificationEvents: NotificationOutboxHandler,
    @Inject(MARKETING_OUTBOX_HANDLER)
    private readonly marketingEvents: MarketingOutboxHandler,
    @Inject(SEO_META_CAPI_OUTBOX_HANDLER)
    private readonly metaCapiEvents: SeoMetaCapiOutboxHandler,
    @Inject(ABANDONED_CART_OUTBOX_HANDLER)
    private readonly abandonedCartEvents: AbandonedCartOutboxHandler,
  ) {}

  public async handle(job: OutboxJobPayload): Promise<void> {
    const processed = await runOutboxDelivery(this.redis, job.outboxId, async () => {
      if (job.eventType === 'CodCollected') {
        await this.handleCodCollected(job.payload);
      }
      if (job.eventType === 'RefundCompleted') {
        await this.handleRefundCompleted(job.payload);
      }

      await this.notificationEvents.handle(job.eventType, job.payload);
      await this.metaCapiEvents.handle(job.eventType, job.payload);
      await this.abandonedCartEvents.handle(job.eventType, job.payload);
      await this.marketingEvents.handle(job.eventType, job.payload);
    });
    if (!processed) {
      this.logger.debug(`Skipping duplicate outbox delivery ${job.outboxId} (${job.eventType})`);
      return;
    }
    this.logger.log(
      `Processed ${job.source} event ${job.eventType} aggregate=${job.aggregateId} v${job.eventVersion}`,
    );
  }

  private async handleCodCollected(payload: Record<string, unknown>): Promise<void> {
    const orderId = String(payload['orderId'] ?? '');
    if (!orderId) {
      this.logger.warn('CodCollected missing orderId; skipping sale recognition.');
      return;
    }
    await this.ledger.recordSaleRecognition({
      orderId,
      paymentIntentId: payload['paymentIntentId'] ? String(payload['paymentIntentId']) : null,
    });
  }

  private async handleRefundCompleted(payload: Record<string, unknown>): Promise<void> {
    const allocation = parseRefundAllocation(payload);
    if (!allocation) {
      this.logger.warn('RefundCompleted missing allocation payload; skipping ledger post.');
      return;
    }
    await this.ledger.recordRefundAllocation(allocation);
  }
}

export function parseRefundAllocation(
  payload: Record<string, unknown>,
): LedgerRefundAllocation | null {
  const raw = payload['allocation'];
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const a = raw as Record<string, unknown>;
  const refundId = String(a['refundId'] ?? '');
  const amountMinor = Number(a['amountMinor']);
  if (!refundId || !Number.isInteger(amountMinor) || amountMinor < 1) {
    return null;
  }
  return {
    entryType: 'REFUND',
    refundId,
    paymentIntentId: String(a['paymentIntentId'] ?? ''),
    orderId: String(a['orderId'] ?? ''),
    vendorId: String(a['vendorId'] ?? ''),
    storeId: String(a['storeId'] ?? ''),
    returnId: a['returnId'] == null ? null : String(a['returnId']),
    amountMinor,
    currencyCode: String(a['currencyCode'] ?? ''),
    method: String(a['method'] ?? ''),
    referenceType: 'REFUND',
    referenceId: String(a['referenceId'] ?? refundId),
    idempotencyKey: String(a['idempotencyKey'] ?? `ledger:refund:${refundId}`),
    commissionReversalMinor:
      a['commissionReversalMinor'] == null ? null : Number(a['commissionReversalMinor']),
  };
}
