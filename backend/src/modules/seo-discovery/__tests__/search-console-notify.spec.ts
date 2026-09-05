import { generateKeyPairSync } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job } from 'bullmq';
import * as googleServiceAccountAuth from '../infrastructure/services/google-service-account-auth';
import {
  createGoogleServiceAccountJwt,
  fetchGoogleAccessToken,
  normalizeGoogleServicePrivateKey,
} from '../infrastructure/services/google-service-account-auth';
import {
  SearchConsoleApiService,
  buildProductionSitemapUrls,
  buildSearchConsoleSiteUrl,
} from '../infrastructure/services/search-console.service';
import { SEO_DISCOVERY_JOB_NAMES } from '../jobs/seo-discovery.constants';
import type { SeoDiscoveryJobPayload } from '../jobs/seo-discovery-job.types';
import { SeoDiscoveryWorker } from '../jobs/seo-discovery.worker';

describe('Search Console notification pipeline', () => {
  describe('normalizeGoogleServicePrivateKey', () => {
    it('converts escaped newline sequences into real PEM line breaks', () => {
      const key = '-----BEGIN PRIVATE KEY-----\\nABC\\nDEF\\n-----END PRIVATE KEY-----';
      expect(normalizeGoogleServicePrivateKey(key)).toBe(
        '-----BEGIN PRIVATE KEY-----\nABC\nDEF\n-----END PRIVATE KEY-----',
      );
    });

    it('leaves already-normalized PEM keys unchanged', () => {
      const key = '-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----';
      expect(normalizeGoogleServicePrivateKey(key)).toBe(key);
    });
  });

  describe('createGoogleServiceAccountJwt', () => {
    it('signs a JWT when the private key PEM is normalized', () => {
      const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
      const pem = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();

      const jwt = createGoogleServiceAccountJwt(
        'search-console@project.iam.gserviceaccount.com',
        pem,
        1_700_000_000,
      );

      expect(jwt.split('.')).toHaveLength(3);
    });
  });

  describe('SearchConsoleApiService', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('submits production sitemap URLs and logs success on HTTP 200', async () => {
      vi.spyOn(googleServiceAccountAuth, 'fetchGoogleAccessToken').mockResolvedValue(
        'test-access-token',
      );

      const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('oauth2.googleapis.com/token')) {
          return new Response(JSON.stringify({ access_token: 'test-access-token' }), {
            status: 200,
          });
        }
        expect(init?.method).toBe('PUT');
        expect(init?.headers).toMatchObject({
          Authorization: 'Bearer test-access-token',
        });
        return new Response('', { status: 200 });
      });
      global.fetch = fetchMock as typeof fetch;

      const config = {
        seoPublicSiteUrl: 'https://shop.example.com',
        googleServicesClientEmail: 'search-console@project.iam.gserviceaccount.com',
        googleServicesPrivateKey:
          '-----BEGIN PRIVATE KEY-----\\ninvalid-for-token\\n-----END PRIVATE KEY-----',
      };
      const runtimeSettings = {
        resolveCanonicalAppUrl: vi.fn(async () => config.seoPublicSiteUrl),
        resolveGoogleSearchConsoleCredentials: vi.fn(async () => ({
          clientEmail: config.googleServicesClientEmail,
          privateKey: config.googleServicesPrivateKey,
        })),
      };
      const service = new SearchConsoleApiService(config as never, runtimeSettings as never);

      const logSpy = vi.spyOn(service['logger'], 'log');

      await service.submitProductionSitemaps();

      const siteUrl = buildSearchConsoleSiteUrl(config.seoPublicSiteUrl);
      const sitemapUrls = buildProductionSitemapUrls(config.seoPublicSiteUrl);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledWith(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrls[0] ?? '')}`,
        expect.objectContaining({ method: 'PUT' }),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrls[1] ?? '')}`,
        expect.objectContaining({ method: 'PUT' }),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Search Console sitemap submitted:'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Search Console notified for 2 production sitemaps'),
      );
    });

    it('uses normalized private key spacing when requesting OAuth tokens', async () => {
      const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
      const pem = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
      const escapedPem = pem.replace(/\n/g, '\\n');

      const fetchMock = vi.fn(
        async () => new Response(JSON.stringify({ access_token: 'ok' }), { status: 200 }),
      );
      global.fetch = fetchMock as typeof fetch;

      await fetchGoogleAccessToken('svc@test.iam.gserviceaccount.com', escapedPem);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('throws on Search Console HTTP failure so BullMQ can retry', async () => {
      vi.spyOn(googleServiceAccountAuth, 'fetchGoogleAccessToken').mockResolvedValue('retry-token');

      global.fetch = vi.fn(
        async () => new Response('quota exceeded', { status: 429 }),
      ) as typeof fetch;

      const config = {
        seoPublicSiteUrl: 'https://shop.example.com',
        googleServicesClientEmail: 'svc@test.iam.gserviceaccount.com',
        googleServicesPrivateKey: 'ignored',
      };
      const runtimeSettings = {
        resolveCanonicalAppUrl: vi.fn(async () => config.seoPublicSiteUrl),
        resolveGoogleSearchConsoleCredentials: vi.fn(async () => ({
          clientEmail: config.googleServicesClientEmail,
          privateKey: config.googleServicesPrivateKey,
        })),
      };
      const service = new SearchConsoleApiService(config as never, runtimeSettings as never);

      await expect(service.submitProductionSitemaps()).rejects.toThrow(
        'Search Console sitemap submit HTTP 429',
      );
    });
  });

  describe('SeoDiscoveryWorker Search Console job routing', () => {
    it('routes ping-search-console to SearchConsoleApiService', async () => {
      const searchConsole = {
        submitProductionSitemaps: vi.fn().mockResolvedValue(undefined),
      };
      const worker = new SeoDiscoveryWorker(
        { isTest: true, outboxDispatchEnabled: false } as never,
        { enqueuePingSearchConsole: vi.fn() } as never,
        { refresh: vi.fn() } as never,
        { generateAll: vi.fn() } as never,
        { sendEvent: vi.fn() } as never,
        { verifyTopProductRoutes: vi.fn() } as never,
        { refresh: vi.fn() } as never,
        searchConsole as never,
      );

      const job = {
        name: SEO_DISCOVERY_JOB_NAMES.pingSearchConsole,
        data: {
          jobName: SEO_DISCOVERY_JOB_NAMES.pingSearchConsole,
          requestedAt: new Date().toISOString(),
        } satisfies SeoDiscoveryJobPayload,
      } as Job<SeoDiscoveryJobPayload>;

      await worker.process(job);

      expect(searchConsole.submitProductionSitemaps).toHaveBeenCalledTimes(1);
    });

    it('enqueues ping-search-console after generate-sitemap-cache completes', async () => {
      const enqueuer = { enqueuePingSearchConsole: vi.fn().mockResolvedValue(undefined) };
      const worker = new SeoDiscoveryWorker(
        { isTest: true, outboxDispatchEnabled: false } as never,
        enqueuer as never,
        { refresh: vi.fn().mockResolvedValue(undefined) } as never,
        { generateAll: vi.fn() } as never,
        { sendEvent: vi.fn() } as never,
        { verifyTopProductRoutes: vi.fn() } as never,
        { refresh: vi.fn() } as never,
        { submitProductionSitemaps: vi.fn() } as never,
      );

      await worker.process({
        name: SEO_DISCOVERY_JOB_NAMES.generateSitemapCache,
        data: {
          jobName: SEO_DISCOVERY_JOB_NAMES.generateSitemapCache,
          requestedAt: new Date().toISOString(),
        },
      } as Job<SeoDiscoveryJobPayload>);

      expect(enqueuer.enqueuePingSearchConsole).toHaveBeenCalledTimes(1);
    });
  });
});
