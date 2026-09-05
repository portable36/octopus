import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, type ConnectionOptions, type JobsOptions } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { AppConfigService } from '../../../config/app-config.service';
import { bullmqQueueOptions } from '../../../shared-kernel/infrastructure/observability/bullmq-telemetry';
import { BULLMQ_DEFAULT_JOB_OPTIONS } from '../../../shared-kernel/infrastructure/queues/bullmq-default-job-options';
import {
  AI_PERSONALIZATION_JOB_NAMES,
  AI_PERSONALIZATION_QUEUE,
} from './ai-personalization.constants';
import type { AiPersonalizationJobPayload } from './ai-personalization-job.types';

@Injectable()
export class AiPersonalizationEnqueuerService implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(AiPersonalizationEnqueuerService.name);
  private queue: Queue<AiPersonalizationJobPayload> | null = null;
  private readonly connection: ConnectionOptions;

  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {
    this.connection = {
      url: this.config.redisUrl,
      maxRetriesPerRequest: null,
    };
  }

  public async onModuleInit(): Promise<void> {
    if (
      this.config.isTest ||
      !this.config.outboxDispatchEnabled ||
      !this.config.aiPersonalizationWorkerEnabled
    ) {
      return;
    }

    await this.ensureQueue().add(
      AI_PERSONALIZATION_JOB_NAMES.analyzePurchasePatterns,
      {
        jobName: AI_PERSONALIZATION_JOB_NAMES.analyzePurchasePatterns,
        requestedAt: new Date().toISOString(),
      },
      {
        ...BULLMQ_DEFAULT_JOB_OPTIONS,
        jobId: 'analyze-purchase-patterns-nightly',
        repeat: { every: 24 * 60 * 60 * 1000 },
      } as JobsOptions,
    );
    this.logger.log(`Scheduled nightly ${AI_PERSONALIZATION_JOB_NAMES.analyzePurchasePatterns}.`);
  }

  public async enqueueAnalyzePurchasePatterns(): Promise<void> {
    if (this.config.isTest || !this.config.outboxDispatchEnabled) {
      this.logger.warn(
        'AI personalization enqueue skipped (test or OUTBOX_DISPATCH_ENABLED=false).',
      );
      return;
    }

    await this.ensureQueue().add(
      AI_PERSONALIZATION_JOB_NAMES.analyzePurchasePatterns,
      {
        jobName: AI_PERSONALIZATION_JOB_NAMES.analyzePurchasePatterns,
        requestedAt: new Date().toISOString(),
      },
      {
        ...BULLMQ_DEFAULT_JOB_OPTIONS,
        jobId: `${AI_PERSONALIZATION_JOB_NAMES.analyzePurchasePatterns}-${randomUUID()}`,
      },
    );
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
  }

  public getQueue(): Queue<AiPersonalizationJobPayload> {
    return this.ensureQueue();
  }

  private ensureQueue(): Queue<AiPersonalizationJobPayload> {
    if (!this.queue) {
      this.queue = new Queue<AiPersonalizationJobPayload>(
        AI_PERSONALIZATION_QUEUE,
        bullmqQueueOptions(this.connection),
      );
    }
    return this.queue;
  }
}
