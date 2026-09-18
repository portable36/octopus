import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, type ConnectionOptions, type Job } from 'bullmq';
import { AppConfigService } from '../../../../config/app-config.service';
import { bullmqWorkerOptions } from '../../../../shared-kernel/infrastructure/observability/bullmq-telemetry';
import { registerBullmqQueueMetrics } from '../../../../shared-kernel/infrastructure/observability/queue-metrics';
import { sniffImageContentType } from '../../domain/services/sniff-image-content-type';
import {
  MEDIA_REPOSITORY,
  type MediaRepository,
} from '../../application/ports/media-repository.interface';
import {
  OBJECT_STORAGE,
  type ObjectStoragePort,
} from '../../application/ports/object-storage.port';
import { MEDIA_PROCESSING_JOB_NAMES, MEDIA_PROCESSING_QUEUE } from './media-processing.constants';
import type { MediaProcessingJobPayload } from './media-processing-job.types';
import { MediaProcessingEnqueuerService } from './media-processing-enqueuer.service';

const PREFIX_BYTES = 64;

@Injectable()
export class MediaProcessingWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaProcessingWorker.name);
  private worker: Worker<MediaProcessingJobPayload> | null = null;
  private readonly connection: ConnectionOptions;

  constructor(
    @Inject(AppConfigService) private readonly config: AppConfigService,
    @Inject(MediaProcessingEnqueuerService)
    private readonly enqueuer: MediaProcessingEnqueuerService,
    @Inject(MEDIA_REPOSITORY) private readonly media: MediaRepository,
    @Inject(OBJECT_STORAGE) private readonly objectStorage: ObjectStoragePort,
  ) {
    this.connection = {
      url: this.config.redisUrl,
      maxRetriesPerRequest: null,
    };
  }

  public async onModuleInit(): Promise<void> {
    if (!this.enqueuer.isQueueActive()) {
      this.logger.log('Media processing worker disabled (test or OUTBOX_DISPATCH_ENABLED=false).');
      return;
    }

    registerBullmqQueueMetrics([{ name: MEDIA_PROCESSING_QUEUE, queue: this.enqueuer.getQueue() }]);

    this.worker = new Worker<MediaProcessingJobPayload>(
      MEDIA_PROCESSING_QUEUE,
      async (job) => this.process(job),
      bullmqWorkerOptions(
        this.connection,
        this.config.bullmqConcurrencyDefault,
        this.config.bullmqJobTimeoutMs,
      ),
    );

    this.worker.on('failed', (job, err) => {
      this.logger.warn(`Media job ${job?.id ?? 'unknown'} failed: ${err.message}`);
    });

    this.logger.log(`Media processing worker listening on ${MEDIA_PROCESSING_QUEUE}.`);
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }

  public async process(job: Job<MediaProcessingJobPayload>): Promise<void> {
    switch (job.name) {
      case MEDIA_PROCESSING_JOB_NAMES.quarantineValidate:
        await this.processQuarantineValidate(job.data.mediaId);
        return;
      case MEDIA_PROCESSING_JOB_NAMES.generateVariants:
        // ponytail: variants/derivatives not generated yet — job reserved for Phase follow-up.
        this.logger.log(`Media variants stub complete for ${job.data.mediaId}.`);
        return;
      default:
        throw new Error(`Unsupported media processing job: ${job.name}`);
    }
  }

  public async processQuarantineValidate(mediaId: string): Promise<void> {
    const asset = await this.media.findById(mediaId);
    if (!asset) {
      this.logger.warn(`Quarantine skipped; media ${mediaId} not found.`);
      return;
    }
    if (asset.status === 'ready' || asset.status === 'rejected') {
      return;
    }

    const prefix = await this.objectStorage.readObjectPrefix(asset.storageKey, PREFIX_BYTES);
    const processedAt = new Date();
    if (!prefix || prefix.length < 12) {
      await this.media.updateProcessingStatus({
        id: mediaId,
        status: 'rejected',
        rejectionReason: 'Object missing or too small for magic-byte validation.',
        processedAt,
      });
      return;
    }

    const sniffed = sniffImageContentType(prefix);
    if (!sniffed || sniffed !== asset.contentType) {
      await this.media.updateProcessingStatus({
        id: mediaId,
        status: 'rejected',
        rejectionReason: sniffed
          ? `Magic bytes (${sniffed}) do not match declared contentType (${asset.contentType}).`
          : 'Unrecognized or disallowed file header.',
        processedAt,
      });
      return;
    }

    await this.media.updateProcessingStatus({
      id: mediaId,
      status: 'ready',
      rejectionReason: null,
      processedAt,
    });
    await this.enqueuer.enqueueGenerateVariants(mediaId);
  }
}
