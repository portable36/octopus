import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, type ConnectionOptions, type Job } from 'bullmq';
import { AppConfigService } from '../../../config/app-config.service';
import { bullmqWorkerOptions } from '../../../shared-kernel/infrastructure/observability/bullmq-telemetry';
import { registerBullmqQueueMetrics } from '../../../shared-kernel/infrastructure/observability/queue-metrics';
import { PurchasePatternAnalysisService } from '../application/services/purchase-pattern-analysis.service';
import { AbandonedCartRecoveryService } from '../application/services/abandoned-cart-recovery.service';
import {
  AI_PERSONALIZATION_JOB_NAMES,
  AI_PERSONALIZATION_QUEUE,
} from './ai-personalization.constants';
import type { AiPersonalizationJobPayload } from './ai-personalization-job.types';
import { AiPersonalizationEnqueuerService } from './ai-personalization-enqueuer.service';

@Injectable()
export class AiPersonalizationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiPersonalizationWorker.name);
  private worker: Worker<AiPersonalizationJobPayload> | null = null;
  private readonly connection: ConnectionOptions;

  constructor(
    private readonly config: AppConfigService,
    private readonly enqueuer: AiPersonalizationEnqueuerService,
    private readonly purchasePatternAnalysis: PurchasePatternAnalysisService,
    private readonly abandonedCartRecovery: AbandonedCartRecoveryService,
  ) {
    this.connection = {
      url: this.config.redisUrl,
      maxRetriesPerRequest: null,
    };
  }

  public async onModuleInit(): Promise<void> {
    if (this.config.isTest || !this.config.aiPersonalizationWorkerEnabled) {
      this.logger.log('AI personalization worker disabled (test or AI_PERSONALIZATION_WORKER_ENABLED=false).');
      return;
    }

    registerBullmqQueueMetrics([
      { name: AI_PERSONALIZATION_QUEUE, queue: this.enqueuer.getQueue() },
    ]);

    this.worker = new Worker<AiPersonalizationJobPayload>(
      AI_PERSONALIZATION_QUEUE,
      async (job) => this.process(job),
      bullmqWorkerOptions(
        this.connection,
        this.config.bullmqConcurrencyDefault,
        this.config.bullmqJobTimeoutMs,
      ),
    );

    this.worker.on('failed', (job, err) => {
      this.logger.warn(`AI personalization job ${job?.id ?? 'unknown'} failed: ${err.message}`);
    });

    this.logger.log(`AI personalization worker listening on ${AI_PERSONALIZATION_QUEUE}.`);
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }

  public async process(job: Job<AiPersonalizationJobPayload>): Promise<void> {
    switch (job.name) {
      case AI_PERSONALIZATION_JOB_NAMES.analyzePurchasePatterns:
        await this.purchasePatternAnalysis.analyzeAndPersist();
        return;
      case AI_PERSONALIZATION_JOB_NAMES.checkAbandonedCart:
        if (job.data.jobName !== AI_PERSONALIZATION_JOB_NAMES.checkAbandonedCart) {
          throw new Error('Invalid abandoned cart job payload');
        }
        await this.abandonedCartRecovery.processAbandonedCart(job.data.cartId);
        return;
      default:
        throw new Error(`Unsupported AI personalization job: ${job.name}`);
    }
  }
}
