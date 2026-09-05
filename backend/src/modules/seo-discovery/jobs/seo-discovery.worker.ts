import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, type ConnectionOptions, type Job } from 'bullmq';
import { AppConfigService } from '../../../config/app-config.service';
import { bullmqWorkerOptions } from '../../../shared-kernel/infrastructure/observability/bullmq-telemetry';
import { registerBullmqQueueMetrics } from '../../../shared-kernel/infrastructure/observability/queue-metrics';
import { ImageSitemapCacheService } from '../application/services/image-sitemap-cache.service';
import { SeoHealthVerificationService } from '../application/services/seo-health-verification.service';
import { SitemapCacheService } from '../application/services/sitemap-cache.service';
import { ProductFeedService } from '../feeds/product-feed.service';
import { MetaCapiService } from '../infrastructure/services/meta-capi.service';
import { SearchConsoleApiService } from '../infrastructure/services/search-console.service';
import { SEO_DISCOVERY_JOB_NAMES, SEO_DISCOVERY_QUEUE } from './seo-discovery.constants';
import type { SeoDiscoveryJobPayload } from './seo-discovery-job.types';
import { SeoDiscoveryEnqueuerService } from './seo-discovery-enqueuer.service';

@Injectable()
export class SeoDiscoveryWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SeoDiscoveryWorker.name);
  private worker: Worker<SeoDiscoveryJobPayload> | null = null;
  private readonly connection: ConnectionOptions;

  constructor(
    @Inject(AppConfigService) private readonly config: AppConfigService,
    private readonly enqueuer: SeoDiscoveryEnqueuerService,
    private readonly sitemapCache: SitemapCacheService,
    private readonly productFeeds: ProductFeedService,
    private readonly metaCapi: MetaCapiService,
    private readonly seoHealth: SeoHealthVerificationService,
    private readonly imageSitemapCache: ImageSitemapCacheService,
    private readonly searchConsole: SearchConsoleApiService,
  ) {
    this.connection = {
      url: this.config.redisUrl,
      maxRetriesPerRequest: null,
    };
  }

  public async onModuleInit(): Promise<void> {
    if (this.config.isTest || !this.config.seoDiscoveryWorkerEnabled) {
      this.logger.log(
        'SEO discovery worker disabled (test or SEO_DISCOVERY_WORKER_ENABLED=false).',
      );
      return;
    }

    registerBullmqQueueMetrics([{ name: SEO_DISCOVERY_QUEUE, queue: this.enqueuer.getQueue() }]);

    this.worker = new Worker<SeoDiscoveryJobPayload>(
      SEO_DISCOVERY_QUEUE,
      async (job) => this.process(job),
      bullmqWorkerOptions(
        this.connection,
        this.config.bullmqConcurrencyDefault,
        this.config.bullmqJobTimeoutMs,
      ),
    );

    this.worker.on('failed', (job, err) => {
      this.logger.warn(`SEO job ${job?.id ?? 'unknown'} failed: ${err.message}`);
    });

    this.logger.log(`SEO discovery worker listening on ${SEO_DISCOVERY_QUEUE}.`);
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }

  public async process(job: Job<SeoDiscoveryJobPayload>): Promise<void> {
    switch (job.name) {
      case SEO_DISCOVERY_JOB_NAMES.generateSitemapCache:
        await this.sitemapCache.refresh();
        await this.enqueuer.enqueuePingSearchConsole();
        return;
      case SEO_DISCOVERY_JOB_NAMES.generateImageSitemap:
        await this.imageSitemapCache.refresh();
        await this.enqueuer.enqueuePingSearchConsole();
        return;
      case SEO_DISCOVERY_JOB_NAMES.generateProductFeeds:
        await this.productFeeds.generateAll();
        return;
      case SEO_DISCOVERY_JOB_NAMES.sendMetaCapiEvent:
        await this.processMetaCapiEvent(job);
        return;
      case SEO_DISCOVERY_JOB_NAMES.verifySeoHealth:
        await this.seoHealth.verifyTopProductRoutes();
        return;
      case SEO_DISCOVERY_JOB_NAMES.pingSearchConsole:
        await this.searchConsole.submitProductionSitemaps();
        return;
      default:
        throw new Error(`Unsupported SEO discovery job: ${job.name}`);
    }
  }

  private async processMetaCapiEvent(job: Job<SeoDiscoveryJobPayload>): Promise<void> {
    const data = job.data;
    if (data.jobName !== SEO_DISCOVERY_JOB_NAMES.sendMetaCapiEvent) {
      throw new Error('Invalid Meta CAPI job payload');
    }

    await this.metaCapi.sendEvent({
      eventName: data.eventName,
      eventTime: data.eventTime,
      eventId: data.eventId,
      userData: data.userData,
      customData: data.customData,
    });
  }
}
