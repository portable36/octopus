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
import { runOutboxDelivery } from '../outbox-delivery';

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
    const processed = await runOutboxDelivery(this.redis, job.outboxId, async () => {
      await this.reporting.handle(job.eventType, job.payload);

      if (job.eventType === 'OrderCreated') {
        return;
      }

      await this.marketing.handle(job.eventType, job.payload);
    });
    if (!processed) {
      this.logger.debug(`Skipping duplicate marketing job ${job.outboxId} (${job.eventType})`);
    }
  }
}
