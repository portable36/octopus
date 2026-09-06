import { Global, MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AppConfigModule } from '../../config/app-config.module';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { RedisModule } from '../../shared-kernel/infrastructure/redis/redis.module';
import { REDIRECT_REPOSITORY } from './application/ports/redirect-repository.interface';
import { SEO_OVERRIDE_REPOSITORY } from './application/ports/seo-override-repository.interface';
import { SITEMAP_SOURCE } from './application/ports/sitemap-source.port';
import { IMAGE_SITEMAP_SOURCE } from './application/ports/image-sitemap-source.port';
import { CRAWL_ERROR_LOG_PORT } from './application/ports/crawl-error-log.port';
import { CATALOG_INTERNAL_LINK_SOURCE } from './application/ports/catalog-internal-link-source.port';
import { CATALOG_SEO_FACTS } from './application/ports/catalog-seo-facts.port';
import { SEO_HEALTH_VERIFICATION_PORT } from './application/ports/seo-health-verification.port';
import { SYSTEM_SETTINGS_PORT } from './application/ports/system-settings.port';
import { CrawlErrorLogService } from './infrastructure/services/crawl-error-log.service';
import { RedirectResolutionService } from './application/services/redirect-resolution.service';
import { SemanticSeoService } from './application/services/semantic-seo.service';
import { SeoAdminService } from './application/services/seo-admin.service';
import { SystemSettingsRuntimeBridge } from './application/services/system-settings-runtime.bridge';
import { SystemSettingsService } from './infrastructure/services/system-settings.service';
import { SeoHealthVerificationService } from './infrastructure/services/seo-health-verification.service';
import { RobotsPolicyService } from './application/services/robots-policy.service';
import { ImageSitemapCacheService } from './application/services/image-sitemap-cache.service';
import { ImageSitemapDeliveryService } from './application/services/image-sitemap-delivery.service';
import { SeoDiscoveryFacade } from './application/services/seo-discovery.facade';
import { SeoMetadataService } from './application/services/seo-metadata.service';
import { SeoPageResolveService } from './application/services/seo-page-resolve.service';
import { SitemapCacheService } from './application/services/sitemap-cache.service';
import { SitemapStreamService } from './application/services/sitemap-stream.service';
import { CatalogProductFeedSourceAdapter } from './feeds/catalog-product-feed-source.adapter';
import { PRODUCT_FEED_SOURCE } from './feeds/product-feed-source.port';
import { ProductFeedService } from './feeds/product-feed.service';
import { SeoArtifactStoreService } from './feeds/seo-artifact-store.service';
import { CrawlErrorLog } from './infrastructure/entities/crawl-error-log.entity';
import { Redirect } from './infrastructure/entities/redirect.entity';
import { SeoHealthIssue } from './infrastructure/entities/seo-health-issue.entity';
import { SystemSetting } from './infrastructure/entities/system-setting.entity';
import { SeoOverride } from './infrastructure/entities/seo-override.entity';
import { CatalogInternalLinkSourceAdapter } from './infrastructure/access/catalog-internal-link-source.adapter';
import { CatalogImageSitemapSourceAdapter } from './infrastructure/access/catalog-image-sitemap-source.adapter';
import { CatalogSitemapSourceAdapter } from './infrastructure/access/catalog-sitemap-source.adapter';
import { CatalogSeoFactsAdapter } from './infrastructure/access/catalog-seo-facts.adapter';
import { RedirectMiddleware } from './infrastructure/middleware/redirect.middleware';
import { RedirectRepositoryAdapter } from './infrastructure/persistence/redirect.repository.adapter';
import { SeoOverrideRepositoryAdapter } from './infrastructure/persistence/seo-override.repository.adapter';
import { SeoDiscoveryEnqueuerService } from './jobs/seo-discovery-enqueuer.service';
import { SeoDiscoveryWorker } from './jobs/seo-discovery.worker';
import { MetaCapiOutboxHandlerAdapter } from './infrastructure/access/meta-capi-outbox-handler.adapter';
import { SeoProvisionerAdapter } from './infrastructure/access/seo-provisioner.adapter';
import { MetaCapiService } from './infrastructure/services/meta-capi.service';
import { SearchConsoleApiService } from './infrastructure/services/search-console.service';
import { SEO_META_CAPI_OUTBOX_HANDLER } from '../../shared-kernel/application/ports/seo-meta-capi-outbox-handler.port';
import { SEO_PROVISIONER } from '../../shared-kernel/application/ports/seo-provisioner.port';
import {
  RobotsController,
  ImageSitemapController,
  SitemapController,
} from './presentation/http/technical-seo.controller';
import { PublicSeoController } from './presentation/http/public-seo.controller';
import { SeoAdminController } from './presentation/controllers/seo-admin.controller';
import { SeoNotFoundFilter } from './presentation/filters/seo-not-found.filter';
import { StructuredDataEngine } from './structured-data/structured-data.engine';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    AppConfigModule,
    MikroOrmModule.forFeature([
      Redirect,
      SeoOverride,
      CrawlErrorLog,
      SeoHealthIssue,
      SystemSetting,
    ]),
  ],
  controllers: [
    RobotsController,
    SitemapController,
    ImageSitemapController,
    PublicSeoController,
    SeoAdminController,
  ],
  providers: [
    SeoDiscoveryEnqueuerService,
    RedirectResolutionService,
    RobotsPolicyService,
    SitemapCacheService,
    SitemapStreamService,
    ImageSitemapCacheService,
    ImageSitemapDeliveryService,
    SeoMetadataService,
    SeoPageResolveService,
    SemanticSeoService,
    CrawlErrorLogService,
    SeoHealthVerificationService,
    SeoAdminService,
    SystemSettingsService,
    SystemSettingsRuntimeBridge,
    StructuredDataEngine,
    ProductFeedService,
    SeoArtifactStoreService,
    SeoDiscoveryWorker,
    MetaCapiService,
    SearchConsoleApiService,
    MetaCapiOutboxHandlerAdapter,
    SeoProvisionerAdapter,
    SeoDiscoveryFacade,
    RedirectMiddleware,
    CatalogSitemapSourceAdapter,
    CatalogImageSitemapSourceAdapter,
    CatalogSeoFactsAdapter,
    CatalogInternalLinkSourceAdapter,
    CatalogProductFeedSourceAdapter,
    {
      provide: CRAWL_ERROR_LOG_PORT,
      useExisting: CrawlErrorLogService,
    },
    {
      provide: CATALOG_INTERNAL_LINK_SOURCE,
      useExisting: CatalogInternalLinkSourceAdapter,
    },
    {
      provide: CATALOG_SEO_FACTS,
      useExisting: CatalogSeoFactsAdapter,
    },
    {
      provide: SEO_HEALTH_VERIFICATION_PORT,
      useExisting: SeoHealthVerificationService,
    },
    {
      provide: SYSTEM_SETTINGS_PORT,
      useExisting: SystemSettingsService,
    },
    {
      provide: APP_FILTER,
      useClass: SeoNotFoundFilter,
    },
    {
      provide: REDIRECT_REPOSITORY,
      useClass: RedirectRepositoryAdapter,
    },
    {
      provide: SEO_OVERRIDE_REPOSITORY,
      useClass: SeoOverrideRepositoryAdapter,
    },
    {
      provide: SITEMAP_SOURCE,
      useClass: CatalogSitemapSourceAdapter,
    },
    {
      provide: IMAGE_SITEMAP_SOURCE,
      useClass: CatalogImageSitemapSourceAdapter,
    },
    {
      provide: PRODUCT_FEED_SOURCE,
      useClass: CatalogProductFeedSourceAdapter,
    },
    {
      provide: SEO_META_CAPI_OUTBOX_HANDLER,
      useExisting: MetaCapiOutboxHandlerAdapter,
    },
    { provide: SEO_PROVISIONER, useExisting: SeoProvisionerAdapter },
  ],
  exports: [SeoDiscoveryFacade, SEO_META_CAPI_OUTBOX_HANDLER, SEO_PROVISIONER],
})
@Global()
export class SeoDiscoveryModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RedirectMiddleware)
      .exclude(
        { path: 'robots.txt', method: RequestMethod.GET },
        { path: 'sitemap.xml', method: RequestMethod.GET },
        { path: 'sitemaps/images.xml', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}
