import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, type ConnectionOptions } from 'bullmq';
import { AppConfigService } from '../../../../config/app-config.service';
import { bullmqQueueOptions } from '../../../../shared-kernel/infrastructure/observability/bullmq-telemetry';
import { BULLMQ_DEFAULT_JOB_OPTIONS } from '../../../../shared-kernel/infrastructure/queues/bullmq-default-job-options';
import { MEDIA_PROCESSING_JOB_NAMES, MEDIA_PROCESSING_QUEUE } from './media-processing.constants';
import type { MediaProcessingJobPayload } from './media-processing-job.types';
import type { MediaProcessingEnqueuerPort } from '../../application/ports/media-processing-enqueuer.port';

@Injectable()
export class MediaProcessingEnqueuerService
  implements MediaProcessingEnqueuerPort, OnModuleDestroy
{
  private readonly logger = new Logger(MediaProcessingEnqueuerService.name);
  private queue: Queue<MediaProcessingJobPayload> | null = null;
  private readonly connection: ConnectionOptions;

  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {
    this.connection = {
      url: this.config.redisUrl,
      maxRetriesPerRequest: null,
    };
  }

  /** True when jobs should be queued (API stays sync-ready when false). */
  public isQueueActive(): boolean {
    return !this.config.isTest && this.config.outboxDispatchEnabled;
  }

  public async enqueueQuarantineValidate(mediaId: string): Promise<boolean> {
    if (!this.isQueueActive()) {
      this.logger.warn('Media quarantine enqueue skipped (test or OUTBOX_DISPATCH_ENABLED=false).');
      return false;
    }

    await this.ensureQueue().add(
      MEDIA_PROCESSING_JOB_NAMES.quarantineValidate,
      {
        jobName: MEDIA_PROCESSING_JOB_NAMES.quarantineValidate,
        mediaId,
        requestedAt: new Date().toISOString(),
      },
      {
        ...BULLMQ_DEFAULT_JOB_OPTIONS,
        jobId: `media-quarantine-${mediaId}`,
      },
    );
    return true;
  }

  public async enqueueGenerateVariants(mediaId: string): Promise<boolean> {
    if (!this.isQueueActive()) {
      return false;
    }

    await this.ensureQueue().add(
      MEDIA_PROCESSING_JOB_NAMES.generateVariants,
      {
        jobName: MEDIA_PROCESSING_JOB_NAMES.generateVariants,
        mediaId,
        requestedAt: new Date().toISOString(),
      },
      {
        ...BULLMQ_DEFAULT_JOB_OPTIONS,
        jobId: `media-variants-${mediaId}`,
      },
    );
    return true;
  }

  public getQueue(): Queue<MediaProcessingJobPayload> {
    return this.ensureQueue();
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
  }

  private ensureQueue(): Queue<MediaProcessingJobPayload> {
    if (!this.queue) {
      this.queue = new Queue(MEDIA_PROCESSING_QUEUE, bullmqQueueOptions(this.connection));
    }
    return this.queue;
  }
}
