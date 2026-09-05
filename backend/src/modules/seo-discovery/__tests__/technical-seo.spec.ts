import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { AppConfigService } from '../../../config/app-config.service';
import { RedirectResolutionService } from '../application/services/redirect-resolution.service';
import { RobotsPolicyService } from '../application/services/robots-policy.service';
import { SitemapStreamService } from '../application/services/sitemap-stream.service';
import { RedirectMiddleware } from '../infrastructure/middleware/redirect.middleware';
import { RobotsController, SitemapController } from '../presentation/http/technical-seo.controller';

describe('technical SEO core', () => {
  describe('RedirectMiddleware', () => {
    const redirects = {
      resolve: vi.fn(),
    };
    let middleware: RedirectMiddleware;

    beforeEach(() => {
      vi.clearAllMocks();
      middleware = new RedirectMiddleware(redirects as unknown as RedirectResolutionService);
    });

    function mockResponse(): Response {
      return {
        status: vi.fn().mockReturnThis(),
        redirect: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;
    }

    it('short-circuits with 301 and does not call next when a redirect matches', async () => {
      redirects.resolve.mockResolvedValue({
        sourceUrl: '/old-path',
        targetUrl: '/new-path',
        statusCode: 301,
      });
      const req = {
        path: '/old-path',
        protocol: 'https',
        get: vi.fn().mockReturnValue('shop.example.com'),
      } as unknown as Request;
      const res = mockResponse();
      const next = vi.fn() as NextFunction;

      await middleware.use(req, res, next);

      expect(redirects.resolve).toHaveBeenCalledWith('/old-path');
      expect(res.redirect).toHaveBeenCalledWith(301, 'https://shop.example.com/new-path');
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 410 without calling next when a gone rule matches', async () => {
      redirects.resolve.mockResolvedValue({
        sourceUrl: '/retired',
        targetUrl: '',
        statusCode: 410,
      });
      const req = { path: '/retired' } as Request;
      const res = mockResponse();
      const next = vi.fn() as NextFunction;

      await middleware.use(req, res, next);

      expect(res.status).toHaveBeenCalledWith(410);
      expect(res.end).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('skips API routes without hitting the redirect repository', async () => {
      const req = { path: '/api/v1/public/categories' } as Request;
      const res = mockResponse();
      const next = vi.fn() as NextFunction;

      await middleware.use(req, res, next);

      expect(redirects.resolve).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('RobotsPolicyService', () => {
    it('renders production disallow rules and custom env paths', () => {
      const config = {
        seoPublicSiteUrl: 'https://shop.example.com',
        seoRobotsDisallow: ['/private', '/preview'],
      } as unknown as AppConfigService;
      const service = new RobotsPolicyService(config);
      const body = service.renderRobotsTxt();

      expect(body).toContain('User-agent: *');
      expect(body).toContain('Disallow: /admin');
      expect(body).toContain('Disallow: /checkout');
      expect(body).toContain('Disallow: /private');
      expect(body).toContain('Disallow: /preview');
      expect(body).toContain('Sitemap: https://shop.example.com/sitemap.xml');
    });
  });

  describe('SitemapController', () => {
    it('returns application/xml content type via streaming service', async () => {
      const pipeXml = vi.fn(async (response: Response) => {
        response.setHeader('Content-Type', 'application/xml; charset=utf-8');
        response.write('<urlset></urlset>');
        response.end();
      });

      const controller = new SitemapController({
        pipeXml,
      } as unknown as SitemapStreamService);

      const response = {
        setHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;

      await controller.getSitemap(response);

      expect(pipeXml).toHaveBeenCalledWith(response);
      expect(response.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/xml; charset=utf-8',
      );
    });
  });

  describe('RobotsController', () => {
    it('exposes robots.txt as plain text', () => {
      const robots = {
        renderRobotsTxt: vi.fn().mockReturnValue('User-agent: *\nDisallow: /admin\n'),
      };
      const controller = new RobotsController(robots as unknown as RobotsPolicyService);
      expect(controller.getRobotsTxt()).toContain('Disallow: /admin');
    });
  });

  describe('SitemapStreamService integration', () => {
    it('streams batched url entries into xml', async () => {
      async function* streamEntries() {
        yield [
          {
            loc: 'https://shop.example.com/',
            changefreq: 'daily' as const,
            priority: 1,
          },
        ];
      }

      const service = new SitemapStreamService(
        {
          streamEntries,
        } as unknown as import('../application/ports/sitemap-source.port').SitemapSourcePort,
        {
          getCachedBuffer: () => null,
          loadFromDisk: async () => null,
        } as unknown as import('../application/services/sitemap-cache.service').SitemapCacheService,
        {
          sitemapItemsPerChunk: 5000,
          seoCacheTtlSeconds: 86_400,
        } as never,
        {
          resolveSitemapItemsPerChunk: async () => 5000,
        } as never,
      );

      const chunks: string[] = [];
      const response = {
        setHeader: vi.fn(),
        write: vi.fn((chunk: string) => {
          chunks.push(chunk);
        }),
        end: vi.fn(),
      } as unknown as Response;

      await service.pipeXml(response, 100);

      const xml = chunks.join('');
      expect(response.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/xml; charset=utf-8',
      );
      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<loc>https://shop.example.com/</loc>');
      expect(xml).toContain('</urlset>');
    });
  });
});
