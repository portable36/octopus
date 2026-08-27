import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import {
  MARKETING_OUTBOX_HANDLER,
  type MarketingOutboxHandler,
} from '../../../../shared-kernel/application/ports/marketing-outbox-handler.port';
import {
  REPORTING_OUTBOX_HANDLER,
  type ReportingOutboxHandler,
} from '../../../../shared-kernel/application/ports/reporting-outbox-handler.port';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';
import type { OutboxJobPayload } from '../../domain/outbox.types';

/**
 * BullMQ worker for octopus.marketing (OrderCreated / OrderPaid from order outbox).
 * CodCollected / RefundCompleted are handled via MARKETING_OUTBOX_HANDLER from DomainEventsProcessor.
 * Reporting projections share this queue (ponytail: one route per event until fan-out exists).
 */
@Injectable()
export class MarketingProcessor {
  private readonly logger = new Logger(MarketingProcessor.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(MARKETING_OUTBOX_HANDLER) private readonly marketing: MarketingOutboxHandler,
    @Inject(REPORTING_OUTBOX_HANDLER) private readonly reporting: ReportingOutboxHandler,
  ) {}

  public async handle(job: OutboxJobPayload): Promise<void> {
    const dedupeKey = `outbox:processed:${job.outboxId}`;
    const claimed = await this.redis.set(dedupeKey, '1', 'EX', 60 * 60 * 24 * 14, 'NX');
    if (claimed !== 'OK') {
      this.logger.debug(`Skipping duplicate marketing job ${job.outboxId} (${job.eventType})`);
      return;
    }

    await this.reporting.handle(job.eventType, job.payload);

    if (job.eventType === 'OrderCreated') {
      return;
    }

    await this.marketing.handle(job.eventType, job.payload);
  }
}
