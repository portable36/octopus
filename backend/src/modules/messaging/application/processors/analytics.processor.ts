import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { recordAnalyticsEvent } from '../../../../shared-kernel/infrastructure/observability/analytics-metrics';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';
import type { OutboxJobPayload } from '../../domain/outbox.types';
import { runOutboxDelivery } from '../outbox-delivery';

/**
 * Idempotent consumer for `octopus.analytics`.
 * Accepts `AnalyticsTrack` / `Analytics*` outbox events; records OTel counters.
 * Third-party tag delivery stays in marketing (Phase 18.6) — this queue is first-party.
 */
@Injectable()
export class AnalyticsProcessor {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  public async handle(job: OutboxJobPayload): Promise<void> {
    const processed = await runOutboxDelivery(this.redis, job.outboxId, async () => {
      const eventName = resolveAnalyticsEventName(job);
      recordAnalyticsEvent(eventName);
      this.logger.log(
        `Analytics ${eventName} aggregate=${job.aggregateId} source=${job.source}`,
      );
    });
    if (!processed) {
      this.logger.debug(`Skipping duplicate analytics job ${job.outboxId} (${job.eventType})`);
    }
  }
}

export function resolveAnalyticsEventName(job: OutboxJobPayload): string {
  if (typeof job.payload['eventName'] === 'string' && job.payload['eventName'].trim()) {
    return job.payload['eventName'].trim();
  }
  if (job.eventType === 'AnalyticsTrack') {
    return 'track';
  }
  if (job.eventType.startsWith('Analytics')) {
    return job.eventType.slice('Analytics'.length) || job.eventType;
  }
  return job.eventType;
}
