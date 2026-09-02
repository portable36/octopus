import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import {
  REDIRECT_REPOSITORY,
  type RedirectRepository,
  type UpsertRedirectInput,
} from '../ports/redirect-repository.interface';
import {
  SEO_OVERRIDE_REPOSITORY,
  type SeoOverrideRepository,
  type UpsertSeoOverrideInput,
} from '../ports/seo-override-repository.interface';
import { SeoDiscoveryEnqueuerService } from '../../jobs/seo-discovery-enqueuer.service';
import { CrawlErrorLogService } from './crawl-error-log.service';
import { SeoHealthVerificationService } from './seo-health-verification.service';

export type SeoArtifactSyncStatus = {
  readonly status: 'fresh' | 'stale' | 'missing';
  readonly lastUpdatedAt: string | null;
  readonly detail: string | null;
};

export type SeoAdminHealth = {
  readonly brokenRedirectsCount: number;
  readonly missingMetadataCount: number;
  readonly crawlErrorsLast24h: number;
  readonly seoHealthIssuesCount: number;
  readonly seoHealthLastScanAt: string | null;
  readonly jobs: {
    readonly sitemap: SeoArtifactSyncStatus;
    readonly productFeeds: SeoArtifactSyncStatus;
    readonly metaCapi: { readonly status: 'configured' | 'not_configured' };
  };
  readonly recentJobs: readonly {
    readonly jobName: string;
    readonly status: string;
    readonly lastRunAt: string | null;
  }[];
};

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SeoAdminService {
  constructor(
    @Inject(SEO_OVERRIDE_REPOSITORY) private readonly overrides: SeoOverrideRepository,
    @Inject(REDIRECT_REPOSITORY) private readonly redirects: RedirectRepository,
    private readonly config: AppConfigService,
    private readonly enqueuer: SeoDiscoveryEnqueuerService,
    private readonly crawlErrors: CrawlErrorLogService,
    private readonly seoHealth: SeoHealthVerificationService,
  ) {}

  public async getHealth(): Promise<SeoAdminHealth> {
    const [brokenRedirectsCount, missingMetadataCount, crawlErrorsLast24h, seoHealthIssuesCount, seoHealthLastScanAt, sitemap, productFeeds] =
      await Promise.all([
      this.redirects.countBroken(),
      this.overrides.countMissingMetadata(),
      this.crawlErrors.countRecent(24),
      this.seoHealth.countOpenIssues(),
      this.seoHealth.latestScanAt(),
      this.readArtifactStatus('sitemap.xml'),
      this.readArtifactStatus(join('feeds', 'google-products.xml')),
    ]);

    const metaFeeds = await this.readArtifactStatus(join('feeds', 'meta-catalog.json'));
    const productFeedStatus = this.mergeFeedStatus(productFeeds, metaFeeds);

    return {
      brokenRedirectsCount,
      missingMetadataCount,
      crawlErrorsLast24h,
      seoHealthIssuesCount,
      seoHealthLastScanAt: seoHealthLastScanAt?.toISOString() ?? null,
      jobs: {
        sitemap,
        productFeeds: productFeedStatus,
        metaCapi: {
          status:
            this.config.metaPixelId && this.config.metaAccessToken
              ? 'configured'
              : 'not_configured',
        },
      },
      recentJobs: [
        {
          jobName: 'generate-sitemap-cache',
          status: sitemap.status,
          lastRunAt: sitemap.lastUpdatedAt,
        },
        {
          jobName: 'generate-product-feeds',
          status: productFeedStatus.status,
          lastRunAt: productFeedStatus.lastUpdatedAt,
        },
        {
          jobName: 'send-meta-capi-event',
          status:
            this.config.metaPixelId && this.config.metaAccessToken ? 'configured' : 'not_configured',
          lastRunAt: null,
        },
        {
          jobName: 'verify-seo-health',
          status: seoHealthLastScanAt ? 'fresh' : 'missing',
          lastRunAt: seoHealthLastScanAt?.toISOString() ?? null,
        },
      ],
    };
  }

  public async saveOverride(input: UpsertSeoOverrideInput) {
    return this.overrides.upsert(input);
  }

  public async saveRedirects(input: UpsertRedirectInput | readonly UpsertRedirectInput[]) {
    const items = Array.isArray(input) ? input : [input];
    const count = await this.redirects.bulkUpsert(items);
    return { count };
  }

  public async enqueueSitemapRefresh(): Promise<void> {
    await this.enqueuer.enqueueSitemapCache();
  }

  public async enqueueProductFeedRefresh(): Promise<void> {
    await this.enqueuer.enqueueProductFeeds();
  }

  public async enqueueVerifySeoHealth(): Promise<void> {
    await this.enqueuer.enqueueVerifySeoHealth();
  }

  public async listCrawlErrors(limit = 50) {
    return this.crawlErrors.listRecent(limit);
  }

  public async listSeoHealthIssues(limit = 100) {
    return this.seoHealth.listIssues(limit);
  }

  private async readArtifactStatus(relativePath: string): Promise<SeoArtifactSyncStatus> {
    const absolutePath = join(this.config.seoCacheDir, relativePath);
    try {
      const fileStat = await stat(absolutePath);
      const ageMs = Date.now() - fileStat.mtimeMs;
      return {
        status: ageMs <= STALE_AFTER_MS ? 'fresh' : 'stale',
        lastUpdatedAt: fileStat.mtime.toISOString(),
        detail: `${fileStat.size} bytes`,
      };
    } catch {
      return {
        status: 'missing',
        lastUpdatedAt: null,
        detail: null,
      };
    }
  }

  private mergeFeedStatus(
    google: SeoArtifactSyncStatus,
    meta: SeoArtifactSyncStatus,
  ): SeoArtifactSyncStatus {
    if (google.status === 'missing' || meta.status === 'missing') {
      return {
        status: 'missing',
        lastUpdatedAt: null,
        detail: null,
      };
    }
    const googleTime = google.lastUpdatedAt ? Date.parse(google.lastUpdatedAt) : 0;
    const metaTime = meta.lastUpdatedAt ? Date.parse(meta.lastUpdatedAt) : 0;
    const lastUpdatedAt =
      googleTime >= metaTime ? google.lastUpdatedAt : meta.lastUpdatedAt;
    const status =
      google.status === 'stale' || meta.status === 'stale' ? 'stale' : 'fresh';
    return {
      status,
      lastUpdatedAt,
      detail: [google.detail, meta.detail].filter(Boolean).join(' · ') || null,
    };
  }
}
