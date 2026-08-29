import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import {
  NOTIFICATION_PORT,
  type NotificationPort,
} from '../../../../shared-kernel/application/ports/notification.port';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';
import type { OutboxJobPayload } from '../../domain/outbox.types';
import { runOutboxDelivery } from '../outbox-delivery';

@Injectable()
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(NOTIFICATION_PORT) private readonly notifications: NotificationPort,
  ) {}

  public async handle(job: OutboxJobPayload): Promise<void> {
    const processed = await runOutboxDelivery(this.redis, job.outboxId, async () => {
      if (job.eventType !== 'NotificationDeliver') {
        this.logger.debug(`Ignoring non-delivery notification job ${job.eventType}`);
        return;
      }

      const notificationId = String(job.payload['notificationId'] ?? job.aggregateId);
      if (!notificationId) {
        return;
      }
      await this.notifications.processQueuedDelivery(notificationId);
    });
    if (!processed) {
      this.logger.debug(`Skipping duplicate notification job ${job.outboxId}`);
    }
  }
}
