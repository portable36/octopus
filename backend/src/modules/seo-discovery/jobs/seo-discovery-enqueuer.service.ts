import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, type ConnectionOptions } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { AppConfigService } from '../../../config/app-config.service';
import { bullmqQueueOptions } from '../../../shared-kernel/infrastructure/observability/bullmq-telemetry';
import { BULLMQ_DEFAULT_JOB_OPTIONS } from '../../../shared-kernel/infrastructure/queues/bullmq-default-job-options';
import {
  SEO_DISCOVERY_JOB_NAMES,
  SEO_DISCOVERY_QUEUE,
  type SeoDiscoveryJobName,
} from './seo-discovery.constants';
import type {
  MetaCapiEnqueueInput,
  SeoDiscoveryJobPayload,
  SeoDiscoveryMaintenanceJobPayload,
} from './seo-discovery-job.types';
import { SEO_SEARCH_CONSOLE_PING_JOB_OPTIONS } from './seo-search-console-job.options';
import { SEO_META_CAPI_JOB_OPTIONS } from './seo-meta-capi-job.options';

function isDuplicateJobIdError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /already exists|JobId/i.test(message);
}

@Injectable()
export class SeoDiscoveryEnqueuerService implements OnModuleDestroy {
  private readonly logger = new Logger(SeoDiscoveryEnqueuerService.name);
  private queue: Queue<SeoDiscoveryJobPayload> | null = null;
  private readonly connection: ConnectionOptions;

  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {
    this.connection = {
      url: this.config.redisUrl,
      maxRetriesPerRequest: null,
    };
  }

  public async enqueue(
    jobName: Exclude<SeoDiscoveryJobName, typeof SEO_DISCOVERY_JOB_NAMES.sendMetaCapiEvent>,
  ): Promise<void> {
    if (this.config.isTest || !this.config.outboxDispatchEnabled) {
      this.logger.warn('SEO discovery enqueue skipped (test or OUTBOX_DISPATCH_ENABLED=false).');
      return;
    }

    const payload: SeoDiscoveryMaintenanceJobPayload = {
      jobName,
      requestedAt: new Date().toISOString(),
    };
    await this.ensureQueue().add(jobName, payload, {
      ...BULLMQ_DEFAULT_JOB_OPTIONS,
      jobId: `${jobName}-${randomUUID()}`,
    });
  }

  public async enqueueSitemapCache(): Promise<void> {
    await this.enqueue(SEO_DISCOVERY_JOB_NAMES.generateSitemapCache);
  }

  public async enqueueImageSitemap(): Promise<void> {
    await this.enqueue(SEO_DISCOVERY_JOB_NAMES.generateImageSitemap);
  }

  public async enqueuePingSearchConsole(): Promise<void> {
    if (this.config.isTest || !this.config.outboxDispatchEnabled) {
      this.logger.debug(
        'Search Console ping enqueue skipped (test or OUTBOX_DISPATCH_ENABLED=false).',
      );
      return;
    }

    const payload: SeoDiscoveryMaintenanceJobPayload = {
      jobName: SEO_DISCOVERY_JOB_NAMES.pingSearchConsole,
      requestedAt: new Date().toISOString(),
    };

    try {
      await this.ensureQueue().add(SEO_DISCOVERY_JOB_NAMES.pingSearchConsole, payload, {
        ...SEO_SEARCH_CONSOLE_PING_JOB_OPTIONS,
        jobId: SEO_DISCOVERY_JOB_NAMES.pingSearchConsole,
      });
    } catch (error) {
      if (isDuplicateJobIdError(error)) {
        this.logger.debug('Search Console ping already queued; treating as success.');
        return;
      }
      throw error;
    }
  }

  public async enqueueProductFeeds(): Promise<void> {
    await this.enqueue(SEO_DISCOVERY_JOB_NAMES.generateProductFeeds);
  }

  public async enqueueVerifySeoHealth(): Promise<void> {
    if (this.config.isTest || !this.config.outboxDispatchEnabled) {
      this.logger.warn(
        'SEO health verification enqueue skipped (test or OUTBOX_DISPATCH_ENABLED=false).',
      );
      return;
    }

    const payload: SeoDiscoveryMaintenanceJobPayload = {
      jobName: SEO_DISCOVERY_JOB_NAMES.verifySeoHealth,
      requestedAt: new Date().toISOString(),
    };
    await this.ensureQueue().add(SEO_DISCOVERY_JOB_NAMES.verifySeoHealth, payload, {
      ...BULLMQ_DEFAULT_JOB_OPTIONS,
      jobId: `${SEO_DISCOVERY_JOB_NAMES.verifySeoHealth}-${randomUUID()}`,
      priority: 20,
    });
  }

  public async enqueueMetaCapiEvent(input: MetaCapiEnqueueInput): Promise<void> {
    if (this.config.isTest || !this.config.outboxDispatchEnabled) {
      this.logger.warn('Meta CAPI enqueue skipped (test or OUTBOX_DISPATCH_ENABLED=false).');
      return;
    }

    const payload: SeoDiscoveryJobPayload = {
      jobName: SEO_DISCOVERY_JOB_NAMES.sendMetaCapiEvent,
      requestedAt: new Date().toISOString(),
      ...input,
    };

    try {
      await this.ensureQueue().add(SEO_DISCOVERY_JOB_NAMES.sendMetaCapiEvent, payload, {
        ...SEO_META_CAPI_JOB_OPTIONS,
        jobId: `${SEO_DISCOVERY_JOB_NAMES.sendMetaCapiEvent}-${input.eventId}`,
      });
    } catch (error) {
      if (isDuplicateJobIdError(error)) {
        this.logger.debug(
          `Meta CAPI event ${input.eventId} already queued; treating as success.`,
        );
        return;
      }
      throw error;
    }
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
  }

  public getQueue(): Queue<SeoDiscoveryJobPayload> {
    return this.ensureQueue();
  }

  private ensureQueue(): Queue<SeoDiscoveryJobPayload> {
    if (!this.queue) {
      this.queue = new Queue<SeoDiscoveryJobPayload>(
        SEO_DISCOVERY_QUEUE,
        bullmqQueueOptions(this.connection),
      );
    }
    return this.queue;
  }
}
