import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import {
  LEDGER_PORT,
  type LedgerPort,
  type LedgerRefundAllocation,
} from '../../../../shared-kernel/application/ports/ledger.port';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';
import type { OutboxJobPayload } from '../../domain/outbox.types';

/**
 * Idempotent domain-event consumer.
 * Phase 14.4: RefundCompleted → LedgerPort stub. Email/search/webhooks later.
 */
@Injectable()
export class DomainEventsProcessor {
  private readonly logger = new Logger(DomainEventsProcessor.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(LEDGER_PORT) private readonly ledger: LedgerPort,
  ) {}

  public async handle(job: OutboxJobPayload): Promise<void> {
    const dedupeKey = `outbox:processed:${job.outboxId}`;
    const claimed = await this.redis.set(dedupeKey, '1', 'EX', 60 * 60 * 24 * 14, 'NX');
    if (claimed !== 'OK') {
      this.logger.debug(`Skipping duplicate outbox delivery ${job.outboxId} (${job.eventType})`);
      return;
    }

    this.logger.log(
      `Processed ${job.source} event ${job.eventType} aggregate=${job.aggregateId} v${job.eventVersion}`,
    );

    if (job.eventType === 'RefundCompleted') {
      await this.handleRefundCompleted(job.payload);
    }
  }

  private async handleRefundCompleted(payload: Record<string, unknown>): Promise<void> {
    const allocation = parseRefundAllocation(payload);
    if (!allocation) {
      this.logger.warn('RefundCompleted missing allocation payload; skipping ledger stub.');
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
