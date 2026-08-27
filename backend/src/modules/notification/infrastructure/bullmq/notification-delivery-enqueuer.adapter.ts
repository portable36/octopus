import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, type ConnectionOptions } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { AppConfigService } from '../../../../config/app-config.service';
import { bullmqQueueOptions } from '../../../../shared-kernel/infrastructure/observability/bullmq-telemetry';
import { BULLMQ_DEFAULT_JOB_OPTIONS } from '../../../../shared-kernel/infrastructure/queues/bullmq-default-job-options';
import type { NotificationDeliveryEnqueuerPort } from '../../application/ports/notification-delivery-enqueuer.port';

/** Match messaging QUEUE_NAMES.notification — literal avoids cross-module import. */
export const NOTIFICATION_QUEUE = 'octopus.notification';

@Injectable()
export class NotificationDeliveryEnqueuerAdapter
  implements NotificationDeliveryEnqueuerPort, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationDeliveryEnqueuerAdapter.name);
  private queue: Queue | null = null;
  private readonly connection: ConnectionOptions;

  constructor(private readonly config: AppConfigService) {
    this.connection = {
      url: this.config.redisUrl,
      maxRetriesPerRequest: null,
    };
  }

  public async enqueueEmailDelivery(notificationId: string): Promise<void> {
    if (this.config.isTest || !this.config.outboxDispatchEnabled) {
      this.logger.debug(`Skip enqueue NotificationDeliver ${notificationId} (test/disabled).`);
      return;
    }
    const outboxId = randomUUID();
    await this.ensureQueue().add(
      'NotificationDeliver',
      {
        outboxId,
        source: 'notification',
        aggregateId: notificationId,
        eventType: 'NotificationDeliver',
        payload: { notificationId },
        eventVersion: 1,
      },
      {
        ...BULLMQ_DEFAULT_JOB_OPTIONS,
        jobId: `notify-${notificationId}`,
      },
    );
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
  }

  private ensureQueue(): Queue {
    if (!this.queue) {
      this.queue = new Queue(NOTIFICATION_QUEUE, bullmqQueueOptions(this.connection));
    }
    return this.queue;
  }
}
