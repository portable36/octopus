import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Response } from 'express';
import { ImageSitemapCacheService } from '../application/services/image-sitemap-cache.service';
import { ImageSitemapDeliveryService } from '../application/services/image-sitemap-delivery.service';
import type {
  ImageSitemapSourcePort,
  ImageSitemapUrlEntry,
} from '../application/ports/image-sitemap-source.port';
import {
  ImageSitemapGenerator,
  URLSET_OPEN,
  isAbsoluteHttpUrl,
} from '../sitemap/image-sitemap.generator';

describe('image sitemap generation', () => {
  describe('ImageSitemapGenerator', () => {
    const generator = new ImageSitemapGenerator();

    it('emits Google image sitemap namespaces and absolute image:loc URLs', async () => {
      async function* streamEntries(): AsyncGenerator<readonly ImageSitemapUrlEntry[]> {
        yield [
          {
            loc: 'https://shop.example.com/products/widget',
            images: [
              {
                imageLoc: 'https://cdn.example.com/media/widget.jpg',
                title: 'Widget',
              },
              {
                imageLoc: '/relative/only.jpg',
                title: 'Ignored relative path',
              },
            ],
          },
        ];
      }

      const xml = await generator.build(() => streamEntries(), 100);

      expect(xml).toContain(
        'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
      );
      expect(xml).toContain(URLSET_OPEN.trim());
      expect(xml).toContain('<image:loc>https://cdn.example.com/media/widget.jpg</image:loc>');
      expect(xml).toContain('<image:title>Widget</image:title>');
      expect(xml).not.toContain('/relative/only.jpg');

      const locMatches = [...xml.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)];
      expect(locMatches.length).toBeGreaterThan(0);
      for (const match of locMatches) {
        expect(isAbsoluteHttpUrl(match[1] ?? '')).toBe(true);
      }
    });

    it('skips url entries without absolute page loc or valid images', async () => {
      async function* streamEntries(): AsyncGenerator<readonly ImageSitemapUrlEntry[]> {
        yield [
          {
            loc: '/products/no-absolute-loc',
            images: [{ imageLoc: 'https://cdn.example.com/a.jpg', title: 'A' }],
          },
        ];
      }

      const xml = await generator.build(() => streamEntries(), 100);

      expect(xml).not.toContain('<url>');
      expect(xml).toContain('</urlset>');
    });
  });

  describe('ImageSitemapCacheService and delivery', () => {
    let cacheDir: string;

    beforeEach(async () => {
      cacheDir = await mkdtemp(join(tmpdir(), 'octopus-image-sitemap-'));
    });

    it('persists pre-compiled xml for fast controller reads', async () => {
      async function* streamEntries(): AsyncGenerator<readonly ImageSitemapUrlEntry[]> {
        yield [
          {
            loc: 'https://shop.example.com/products/abc',
            images: [
              {
                imageLoc: 'https://cdn.example.com/abc.png',
                title: 'ABC Product',
              },
            ],
          },
        ];
      }

      const source: ImageSitemapSourcePort = { streamEntries };
      const cache = new ImageSitemapCacheService(source, {
        seoCacheDir: cacheDir,
      } as never);

      await cache.refresh(100);

      const diskXml = await readFile(join(cacheDir, 'sitemaps', 'images.xml'), 'utf8');
      expect(diskXml).toContain(
        'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
      );
      expect(diskXml).toContain('https://cdn.example.com/abc.png');

      const delivery = new ImageSitemapDeliveryService(cache, {
        seoCacheTtlSeconds: 86_400,
      } as never);
      const chunks: Buffer[] = [];
      const response = {
        setHeader: () => undefined,
        end: (body: Buffer) => {
          chunks.push(body);
        },
      } as unknown as Response;

      await delivery.serveCachedXml(response);

      const served = Buffer.concat(chunks).toString('utf8');
      expect(served).toBe(diskXml);
      expect(served).toMatch(/<image:loc>https?:\/\/[^<]+<\/image:loc>/);
    });
  });
});
