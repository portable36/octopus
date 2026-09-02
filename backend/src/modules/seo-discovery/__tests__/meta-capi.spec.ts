import { createHash } from 'node:crypto';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Job } from 'bullmq';
import { MetaCapiService } from '../infrastructure/services/meta-capi.service';
import {
  hashMetaEmail,
  hashMetaPhone,
  normalizeEmailForMeta,
  normalizePhoneForMeta,
} from '../infrastructure/services/meta-capi-hash';
import { SEO_DISCOVERY_JOB_NAMES } from '../jobs/seo-discovery.constants';
import type { SeoDiscoveryMetaCapiJobPayload } from '../jobs/seo-discovery-job.types';
import { SeoDiscoveryWorker } from '../jobs/seo-discovery.worker';

describe('Meta CAPI', () => {
  describe('PII normalization and hashing', () => {
    it('normalizes and SHA-256 hashes email before payload generation', () => {
      const email = '  User@Example.COM  ';
      expect(normalizeEmailForMeta(email)).toBe('user@example.com');
      expect(hashMetaEmail(email)).toBe(
        createHash('sha256').update('user@example.com', 'utf8').digest('hex'),
      );
    });

    it('normalizes phone to digits-only before SHA-256 hashing', () => {
      const phone = '+880 1712-345678';
      expect(normalizePhoneForMeta(phone)).toBe('8801712345678');
      expect(hashMetaPhone(phone)).toBe(
        createHash('sha256').update('8801712345678', 'utf8').digest('hex'),
      );
    });

    it('buildHashedUserData omits empty hashed fields and keeps network-safe ip/ua', () => {
      const config = {
        metaPixelId: '123456789',
        metaAccessToken: 'token',
      };
      const service = new MetaCapiService(config as never);

      const hashed = service.buildHashedUserData({
        email: 'buyer@shop.test',
        phone: '01712345678',
        clientIpAddress: '203.0.113.10',
        clientUserAgent: 'OctopusTest/1.0',
      });

      expect(hashed.em).toBe(hashMetaEmail('buyer@shop.test'));
      expect(hashed.ph).toBe(hashMetaPhone('01712345678'));
      expect(hashed.client_ip_address).toBe('203.0.113.10');
      expect(hashed.client_user_agent).toBe('OctopusTest/1.0');
      expect(hashed.em).not.toContain('@');
    });
  });

  describe('MetaCapiService network delivery', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('throws on HTTP failure so BullMQ can retry the job', async () => {
      global.fetch = vi.fn(async () => new Response('error', { status: 500 })) as typeof fetch;

      const config = {
        metaPixelId: '999',
        metaAccessToken: 'secret',
      };
      const service = new MetaCapiService(config as never);

      await expect(
        service.sendEvent({
          eventName: 'Purchase',
          eventTime: 1_700_000_000,
          eventId: 'purchase:ORD-1',
          userData: { email: 'buyer@shop.test' },
          customData: { value: 99.5, currency: 'BDT', orderId: 'ORD-1' },
        }),
      ).rejects.toThrow(/Meta CAPI HTTP 500/);
    });

    it('posts hashed user_data to the Meta Graph events endpoint', async () => {
      let capturedUrl = '';
      let capturedInit: RequestInit | undefined;
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        capturedUrl = url;
        capturedInit = init;
        return new Response('{"events_received":1}', { status: 200 });
      });
      global.fetch = fetchMock as typeof fetch;

      const config = {
        metaPixelId: 'pixel-42',
        metaAccessToken: 'access-token',
      };
      const service = new MetaCapiService(config as never);

      await service.sendEvent({
        eventName: 'Purchase',
        eventTime: 1_700_000_100,
        eventId: 'purchase:ORD-99',
        userData: {
          email: 'buyer@shop.test',
          phone: '+8801712345678',
          clientIpAddress: '198.51.100.4',
          clientUserAgent: 'Mozilla/5.0',
        },
        customData: { value: 1500, currency: 'BDT', orderId: 'ORD-99' },
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(capturedUrl).toBe('https://graph.facebook.com/v21.0/pixel-42/events');

      const body = JSON.parse(String(capturedInit?.body)) as {
        data: Array<{
          user_data: Record<string, string>;
          custom_data: Record<string, unknown>;
        }>;
      };

      expect(body.data[0]?.user_data.em).toBe(hashMetaEmail('buyer@shop.test'));
      expect(body.data[0]?.user_data.ph).toBe(hashMetaPhone('+8801712345678'));
      expect(body.data[0]?.custom_data).toMatchObject({
        value: 1500,
        currency: 'BDT',
        order_id: 'ORD-99',
      });
    });
  });

  describe('SeoDiscoveryWorker Meta CAPI job routing', () => {
    it('propagates Meta CAPI send failures for BullMQ retries', async () => {
      const metaCapi = {
        sendEvent: vi.fn().mockRejectedValue(new Error('Meta CAPI HTTP 503')),
      };
      const worker = new SeoDiscoveryWorker(
        { isTest: true, seoDiscoveryWorkerEnabled: false } as never,
        {} as never,
        { refresh: vi.fn() } as never,
        { generateAll: vi.fn() } as never,
        metaCapi as never,
      );

      const job = {
        name: SEO_DISCOVERY_JOB_NAMES.sendMetaCapiEvent,
        data: {
          jobName: SEO_DISCOVERY_JOB_NAMES.sendMetaCapiEvent,
          requestedAt: new Date().toISOString(),
          eventName: 'Purchase',
          eventTime: 1_700_000_000,
          eventId: 'purchase:ORD-1',
          userData: { email: 'buyer@shop.test' },
          customData: { value: 10, currency: 'BDT', orderId: 'ORD-1' },
        } satisfies SeoDiscoveryMetaCapiJobPayload,
      } as Job<SeoDiscoveryMetaCapiJobPayload>;

      await expect(worker.process(job)).rejects.toThrow('Meta CAPI HTTP 503');
      expect(metaCapi.sendEvent).toHaveBeenCalledTimes(1);
    });
  });
});
