import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AppConfigModule } from '../../config/app-config.module';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { REDIRECT_REPOSITORY } from './application/ports/redirect-repository.interface';
import { SEO_OVERRIDE_REPOSITORY } from './application/ports/seo-override-repository.interface';
import { SITEMAP_SOURCE } from './application/ports/sitemap-source.port';
import { RedirectResolutionService } from './application/services/redirect-resolution.service';
import { SeoAdminService } from './application/services/seo-admin.service';
import { RobotsPolicyService } from './application/services/robots-policy.service';
import { SeoDiscoveryFacade } from './application/services/seo-discovery.facade';
import { SeoMetadataService } from './application/services/seo-metadata.service';
import { SeoPageResolveService } from './application/services/seo-page-resolve.service';
import { SitemapCacheService } from './application/services/sitemap-cache.service';
import { SitemapStreamService } from './application/services/sitemap-stream.service';
import { CatalogProductFeedSourceAdapter } from './feeds/catalog-product-feed-source.adapter';
import { PRODUCT_FEED_SOURCE } from './feeds/product-feed-source.port';
import { ProductFeedService } from './feeds/product-feed.service';
import { SeoArtifactStoreService } from './feeds/seo-artifact-store.service';
import { Redirect } from './infrastructure/entities/redirect.entity';
import { SeoOverride } from './infrastructure/entities/seo-override.entity';
import { CatalogSitemapSourceAdapter } from './infrastructure/access/catalog-sitemap-source.adapter';
import { CatalogSeoFactsAdapter } from './infrastructure/access/catalog-seo-facts.adapter';
import { RedirectMiddleware } from './infrastructure/middleware/redirect.middleware';
import { RedirectRepositoryAdapter } from './infrastructure/persistence/redirect.repository.adapter';
import { SeoOverrideRepositoryAdapter } from './infrastructure/persistence/seo-override.repository.adapter';
import { SeoDiscoveryEnqueuerService } from './jobs/seo-discovery-enqueuer.service';
import { SeoDiscoveryWorker } from './jobs/seo-discovery.worker';
import { MetaCapiOutboxHandlerAdapter } from './infrastructure/access/meta-capi-outbox-handler.adapter';
import { MetaCapiService } from './infrastructure/services/meta-capi.service';
import { SEO_META_CAPI_OUTBOX_HANDLER } from '../../shared-kernel/application/ports/seo-meta-capi-outbox-handler.port';
import { RobotsController, SitemapController } from './presentation/http/technical-seo.controller';
import { PublicSeoController } from './presentation/http/public-seo.controller';
import { SeoAdminController } from './presentation/controllers/seo-admin.controller';
import { StructuredDataEngine } from './structured-data/structured-data.engine';

@Module({
  imports: [
    DatabaseModule,
    AppConfigModule,
    MikroOrmModule.forFeature([Redirect, SeoOverride]),
  ],
  controllers: [RobotsController, SitemapController, PublicSeoController, SeoAdminController],
  providers: [
    RedirectResolutionService,
    RobotsPolicyService,
    SitemapCacheService,
    SitemapStreamService,
    SeoMetadataService,
    SeoPageResolveService,
    SeoAdminService,
    StructuredDataEngine,
    ProductFeedService,
    SeoArtifactStoreService,
    SeoDiscoveryEnqueuerService,
    SeoDiscoveryWorker,
    MetaCapiService,
    MetaCapiOutboxHandlerAdapter,
    SeoDiscoveryFacade,
    RedirectMiddleware,
    CatalogSitemapSourceAdapter,
    CatalogSeoFactsAdapter,
    CatalogProductFeedSourceAdapter,
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
      provide: PRODUCT_FEED_SOURCE,
      useClass: CatalogProductFeedSourceAdapter,
    },
    {
      provide: SEO_META_CAPI_OUTBOX_HANDLER,
      useExisting: MetaCapiOutboxHandlerAdapter,
    },
  ],
  exports: [SeoDiscoveryFacade, SEO_META_CAPI_OUTBOX_HANDLER],
})
export class SeoDiscoveryModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RedirectMiddleware)
      .exclude(
        { path: 'robots.txt', method: RequestMethod.GET },
        { path: 'sitemap.xml', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}
