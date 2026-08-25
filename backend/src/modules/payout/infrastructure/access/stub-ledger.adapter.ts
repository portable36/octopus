import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import {
  type LedgerPort,
  type LedgerRefundAllocation,
} from '../../../../shared-kernel/application/ports/ledger.port';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';

/**
 * Phase 14.4 stub — records refund allocations idempotently in Redis only.
 * Phase 15 replaces with append-only vendor_ledger_entries (no duplicate ledger).
 */
@Injectable()
export class StubLedgerAdapter implements LedgerPort {
  private readonly logger = new Logger(StubLedgerAdapter.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  public async recordRefundAllocation(input: LedgerRefundAllocation): Promise<void> {
    if (
      input.entryType !== 'REFUND' ||
      !Number.isInteger(input.amountMinor) ||
      input.amountMinor < 1
    ) {
      throw new Error('Invalid refund ledger allocation.');
    }

    const claimed = await this.redis.set(
      input.idempotencyKey,
      JSON.stringify({
        entryType: input.entryType,
        refundId: input.refundId,
        amountMinor: input.amountMinor,
        currencyCode: input.currencyCode,
        vendorId: input.vendorId,
        recordedAt: new Date().toISOString(),
      }),
      'EX',
      60 * 60 * 24 * 365,
      'NX',
    );

    if (claimed !== 'OK') {
      this.logger.debug(`Stub ledger skip duplicate ${input.idempotencyKey}`);
      return;
    }

    this.logger.log(
      `Stub ledger DEBIT REFUND ${input.amountMinor} ${input.currencyCode} vendor=${input.vendorId} refund=${input.refundId}`,
    );
  }
}
