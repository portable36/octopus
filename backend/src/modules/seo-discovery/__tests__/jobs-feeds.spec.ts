import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job } from 'bullmq';
import { SitemapCacheService } from '../application/services/sitemap-cache.service';
import type { ProductFeedItem } from '../feeds/product-feed.types';
import type { ProductFeedSourcePort } from '../feeds/product-feed-source.port';
import { ProductFeedService } from '../feeds/product-feed.service';
import { SeoArtifactStoreService } from '../feeds/seo-artifact-store.service';
import { SEO_DISCOVERY_JOB_NAMES } from '../jobs/seo-discovery.constants';
import type { SeoDiscoveryJobPayload } from '../jobs/seo-discovery-job.types';
import { SeoDiscoveryWorker } from '../jobs/seo-discovery.worker';

const sampleItems: readonly ProductFeedItem[] = [
  {
    productId: '11111111-1111-4111-8111-111111111111',
    variantId: '22222222-2222-4222-8222-222222222222',
    sku: 'SKU-001',
    title: 'Wireless Mouse',
    description: 'Ergonomic mouse',
    link: 'https://shop.example.com/products/mouse',
    priceMinor: 2499,
    currencyCode: 'BDT',
    availability: 'in_stock',
    condition: 'new',
  },
  {
    productId: '33333333-3333-4333-8333-333333333333',
    variantId: '44444444-4444-4444-8444-444444444444',
    sku: 'SKU-002',
    title: 'USB Hub',
    description: '7-port hub',
    link: 'https://shop.example.com/products/hub',
    priceMinor: 150000,
    currencyCode: 'BDT',
    availability: 'out_of_stock',
    condition: 'new',
  },
];

describe('SEO discovery jobs and feeds', () => {
  let cacheDir: string;

  beforeEach(async () => {
    cacheDir = await mkdtemp(join(tmpdir(), 'octopus-seo-'));
  });

  describe('ProductFeedService', () => {
    it('aggregates batched catalog items into Google XML and Meta JSON without crashing', async () => {
      async function* streamItems() {
        yield sampleItems;
      }

      const config = {
        seoPublicSiteUrl: 'https://shop.example.com',
        seoCacheDir: cacheDir,
      };
      const feedService = new ProductFeedService(
        { streamItems } as ProductFeedSourcePort,
        new SeoArtifactStoreService(config as never),
        config as never,
      );

      const result = await feedService.generateAll(100);

      expect(result.itemCount).toBe(2);
      expect(result.googleXmlPath).toContain('google-products.xml');
      expect(result.metaJsonPath).toContain('meta-catalog.json');

      const googleXml = await readFile(result.googleXmlPath, 'utf8');
      const metaJson = JSON.parse(await readFile(result.metaJsonPath, 'utf8')) as {
        data: Array<Record<string, unknown>>;
      };

      expect(googleXml).toContain('<g:id>SKU-001</g:id>');
      expect(googleXml).toContain('<g:price>24.99 BDT</g:price>');
      expect(googleXml).toContain('<g:availability>in stock</g:availability>');
      expect(metaJson.data).toHaveLength(2);
      expect(metaJson.data[0]).toMatchObject({
        id: 'SKU-001',
        price: '24.99 BDT',
        availability: 'in stock',
        condition: 'new',
      });
    });
  });

  describe('SeoDiscoveryWorker', () => {
    it('routes generate-sitemap-cache to the sitemap cache refresher', async () => {
      const sitemapCache = {
        refresh: vi.fn().mockResolvedValue(undefined),
      };
      const productFeeds = {
        generateAll: vi.fn(),
      };
      const enqueuer = { enqueuePingSearchConsole: vi.fn() };
      const worker = new SeoDiscoveryWorker(
        { isTest: true, outboxDispatchEnabled: false } as never,
        enqueuer as never,
        sitemapCache as unknown as SitemapCacheService,
        productFeeds as unknown as ProductFeedService,
        { sendEvent: vi.fn() } as never,
        { verifyTopProductRoutes: vi.fn() } as never,
        { refresh: vi.fn() } as never,
        { submitProductionSitemaps: vi.fn() } as never,
      );

      const job = {
        name: SEO_DISCOVERY_JOB_NAMES.generateSitemapCache,
        data: {
          jobName: SEO_DISCOVERY_JOB_NAMES.generateSitemapCache,
          requestedAt: new Date().toISOString(),
        } satisfies SeoDiscoveryJobPayload,
      } as Job<SeoDiscoveryJobPayload>;

      await worker.process(job);

      expect(sitemapCache.refresh).toHaveBeenCalledTimes(1);
      expect(enqueuer.enqueuePingSearchConsole).toHaveBeenCalledTimes(1);
      expect(productFeeds.generateAll).not.toHaveBeenCalled();
    });

    it('routes generate-product-feeds to the product feed generator', async () => {
      const sitemapCache = {
        refresh: vi.fn(),
      };
      const productFeeds = {
        generateAll: vi.fn().mockResolvedValue({
          googleXmlPath: '/tmp/google.xml',
          metaJsonPath: '/tmp/meta.json',
          itemCount: 3,
        }),
      };
      const enqueuer = { enqueuePingSearchConsole: vi.fn() };
      const worker = new SeoDiscoveryWorker(
        { isTest: true, outboxDispatchEnabled: false } as never,
        enqueuer as never,
        sitemapCache as unknown as SitemapCacheService,
        productFeeds as unknown as ProductFeedService,
        { sendEvent: vi.fn() } as never,
        { verifyTopProductRoutes: vi.fn() } as never,
        { refresh: vi.fn() } as never,
        { submitProductionSitemaps: vi.fn() } as never,
      );

      const job = {
        name: SEO_DISCOVERY_JOB_NAMES.generateProductFeeds,
        data: {
          jobName: SEO_DISCOVERY_JOB_NAMES.generateProductFeeds,
          requestedAt: new Date().toISOString(),
        } satisfies SeoDiscoveryJobPayload,
      } as Job<SeoDiscoveryJobPayload>;

      await worker.process(job);

      expect(productFeeds.generateAll).toHaveBeenCalledTimes(1);
      expect(sitemapCache.refresh).not.toHaveBeenCalled();
    });

    it('routes generate-image-sitemap to the image sitemap cache refresher', async () => {
      const imageSitemapCache = {
        refresh: vi.fn().mockResolvedValue(undefined),
      };
      const enqueuer = { enqueuePingSearchConsole: vi.fn() };
      const worker = new SeoDiscoveryWorker(
        { isTest: true, outboxDispatchEnabled: false } as never,
        enqueuer as never,
        { refresh: vi.fn() } as never,
        { generateAll: vi.fn() } as never,
        { sendEvent: vi.fn() } as never,
        { verifyTopProductRoutes: vi.fn() } as never,
        imageSitemapCache as never,
        { submitProductionSitemaps: vi.fn() } as never,
      );

      const job = {
        name: SEO_DISCOVERY_JOB_NAMES.generateImageSitemap,
        data: {
          jobName: SEO_DISCOVERY_JOB_NAMES.generateImageSitemap,
          requestedAt: new Date().toISOString(),
        } satisfies SeoDiscoveryJobPayload,
      } as Job<SeoDiscoveryJobPayload>;

      await worker.process(job);

      expect(imageSitemapCache.refresh).toHaveBeenCalledTimes(1);
      expect(enqueuer.enqueuePingSearchConsole).toHaveBeenCalledTimes(1);
    });
  });

  describe('SitemapCacheService', () => {
    it('persists generated xml for fast controller reads', async () => {
      async function* streamEntries() {
        yield [{ loc: 'https://shop.example.com/', changefreq: 'daily' as const, priority: 1 }];
      }

      const config = { seoCacheDir: cacheDir };
      const cache = new SitemapCacheService({ streamEntries } as never, config as never);

      await cache.refresh(50);

      const buffer = cache.getCachedBuffer();
      expect(buffer).not.toBeNull();
      expect(buffer?.toString('utf8')).toContain('<loc>https://shop.example.com/</loc>');

      await rm(cacheDir, { recursive: true, force: true });
    });
  });
});
