import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { AppConfigService } from '../../../config/app-config.service';
import {
  bullmqQueueOptions,
  bullmqWorkerOptions,
} from '../../../shared-kernel/infrastructure/observability/bullmq-telemetry';
import { registerBullmqQueueMetrics } from '../../../shared-kernel/infrastructure/observability/queue-metrics';
import { recordSearchIndexingLag } from '../../../shared-kernel/infrastructure/observability/business-metrics';
import {
  BULLMQ_DEFAULT_JOB_OPTIONS,
  BULLMQ_DLQ_JOB_OPTIONS,
} from '../../../shared-kernel/infrastructure/queues/bullmq-default-job-options';
import { OUTBOX_STORE, type OutboxStore } from './ports/outbox-store.interface';
import {
  QUEUE_NAMES,
  routeQueueForEvent,
  type OutboxJobPayload,
  type QueueName,
} from '../domain/outbox.types';
import { DomainEventsProcessor } from './processors/domain-events.processor';
import { MarketingProcessor } from './processors/marketing.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { SearchIndexingProcessor } from './processors/search-indexing.processor';

export function isDuplicateJobIdError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /already exists|JobId/i.test(message);
}

@Injectable()
export class OutboxDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxDispatcherService.name);
  private pollTimer: NodeJS.Timeout | null = null;
  private polling = false;
  private readonly queues = new Map<QueueName, Queue<OutboxJobPayload>>();
  private workers: Worker<OutboxJobPayload>[] = [];
  private readonly connection: ConnectionOptions;

  constructor(
    private readonly config: AppConfigService,
    @Inject(OUTBOX_STORE) private readonly outbox: OutboxStore,
    private readonly domainEvents: DomainEventsProcessor,
    private readonly searchIndexing: SearchIndexingProcessor,
    private readonly notifications: NotificationProcessor,
    private readonly marketing: MarketingProcessor,
  ) {
    // BullMQ requires maxRetriesPerRequest: null on its dedicated connection.
    this.connection = {
      url: this.config.redisUrl,
      maxRetriesPerRequest: null,
    };
  }

  public async onModuleInit(): Promise<void> {
    if (this.config.isTest || !this.config.outboxDispatchEnabled) {
      this.logger.log('Outbox dispatcher disabled (test or OUTBOX_DISPATCH_ENABLED=false).');
      return;
    }

    this.ensureQueue(QUEUE_NAMES.domainEvents);
    this.ensureQueue(QUEUE_NAMES.payment);
    this.ensureQueue(QUEUE_NAMES.payout);
    this.ensureQueue(QUEUE_NAMES.searchIndexing);
    this.ensureQueue(QUEUE_NAMES.notification);
    this.ensureQueue(QUEUE_NAMES.marketing);
    this.ensureQueue(QUEUE_NAMES.deadLetter);

    registerBullmqQueueMetrics(
      [...this.queues.entries()].map(([name, queue]) => ({ name, queue })),
    );

    const defaultConcurrency = this.config.bullmqConcurrencyDefault;
    const payoutConcurrency = this.config.bullmqConcurrencyPayout;
    const searchConcurrency = this.config.bullmqConcurrencySearch;
    const lockDurationMs = this.config.bullmqJobTimeoutMs;

    this.workers.push(
      new Worker<OutboxJobPayload>(
        QUEUE_NAMES.domainEvents,
        async (job) => this.domainEvents.handle(job.data),
        bullmqWorkerOptions(this.connection, defaultConcurrency, lockDurationMs),
      ),
      new Worker<OutboxJobPayload>(
        QUEUE_NAMES.payment,
        async (job) => this.domainEvents.handle(job.data),
        bullmqWorkerOptions(this.connection, defaultConcurrency, lockDurationMs),
      ),
      new Worker<OutboxJobPayload>(
        QUEUE_NAMES.payout,
        async (job) => this.domainEvents.handle(job.data),
        bullmqWorkerOptions(this.connection, payoutConcurrency, lockDurationMs),
      ),
      new Worker<OutboxJobPayload>(
        QUEUE_NAMES.searchIndexing,
        async (job) => {
          await this.searchIndexing.handle(job.data);
          recordSearchIndexingLag(Date.now() - job.timestamp);
        },
        bullmqWorkerOptions(this.connection, searchConcurrency, lockDurationMs),
      ),
      new Worker<OutboxJobPayload>(
        QUEUE_NAMES.notification,
        async (job) => this.notifications.handle(job.data),
        bullmqWorkerOptions(this.connection, defaultConcurrency, lockDurationMs),
      ),
      new Worker<OutboxJobPayload>(
        QUEUE_NAMES.marketing,
        async (job) => this.marketing.handle(job.data),
        bullmqWorkerOptions(this.connection, defaultConcurrency, lockDurationMs),
      ),
    );

    for (const worker of this.workers) {
      worker.on('failed', (job, err) => {
        this.logger.warn(`Job ${job?.id ?? 'unknown'} failed on ${worker.name}: ${err.message}`);
      });
    }

    this.pollTimer = setInterval(() => {
      void this.pollOnce();
    }, this.config.outboxPollIntervalMs);
    this.pollTimer.unref?.();
    this.logger.log(
      `Outbox dispatcher started (poll=${this.config.outboxPollIntervalMs}ms batch=${this.config.outboxBatchSize} concurrency=${defaultConcurrency}/${payoutConcurrency}/${searchConcurrency} timeout=${this.config.bullmqJobTimeoutMs}ms).`,
    );
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    await Promise.all(this.workers.map((worker) => worker.close()));
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
  }

  /** Exposed for unit tests / manual ops probes. */
  public async pollOnce(): Promise<number> {
    if (this.polling) {
      return 0;
    }
    this.polling = true;
    try {
      const rows = await this.outbox.claimUnpublished(
        this.config.outboxBatchSize,
        this.config.outboxMaxDispatchRetries,
      );
      const jobOptions = BULLMQ_DEFAULT_JOB_OPTIONS;
      let published = 0;
      for (const row of rows) {
        const queueName = routeQueueForEvent(row.eventType);
        const queue = this.ensureQueue(queueName);
        const payload: OutboxJobPayload = {
          outboxId: row.id,
          source: row.source,
          aggregateId: row.aggregateId,
          eventType: row.eventType,
          payload: row.payload,
          eventVersion: row.eventVersion,
        };
        try {
          await queue.add(row.eventType, payload, {
            ...jobOptions,
            jobId: row.id,
          });
          await this.outbox.markPublished(row.source, row.id);
          published += 1;
        } catch (error) {
          // Concurrent pollers may race; stable jobId makes duplicate enqueue a success.
          if (isDuplicateJobIdError(error)) {
            await this.outbox.markPublished(row.source, row.id);
            published += 1;
            continue;
          }
          await this.outbox.markDispatchFailure(row.source, row.id);
          this.logger.error(
            `Failed to enqueue outbox ${row.id} (${row.eventType}): ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          if (row.retryCount + 1 >= this.config.outboxMaxDispatchRetries) {
            await this.ensureQueue(QUEUE_NAMES.deadLetter).add('dispatch-exhausted', payload, {
              ...BULLMQ_DLQ_JOB_OPTIONS,
              jobId: `dlq-${row.id}`,
            });
          }
        }
      }
      return published;
    } finally {
      this.polling = false;
    }
  }

  private ensureQueue(name: QueueName): Queue<OutboxJobPayload> {
    const existing = this.queues.get(name);
    if (existing) {
      return existing;
    }
    const queue = new Queue<OutboxJobPayload>(name, bullmqQueueOptions(this.connection));
    this.queues.set(name, queue);
    return queue;
  }
}
