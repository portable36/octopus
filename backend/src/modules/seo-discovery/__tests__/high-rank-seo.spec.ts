import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { ArgumentsHost } from '@nestjs/common';
import type { Request, Response } from 'express';
import { embedInternalLinks } from '../domain/embed-internal-links';
import { analyzePageSeoHealth } from '../domain/analyze-page-seo-health';
import { SeoNotFoundFilter } from '../presentation/filters/seo-not-found.filter';

describe('high-rank SEO engine', () => {
  describe('embedInternalLinks', () => {
    it('embeds valid context anchors without breaking pre-existing HTML markup blocks', () => {
      const html =
        '<p>Shop our <strong>Apparel</strong> collection and <a href="/existing">Apparel</a> picks.</p>';
      const linked = embedInternalLinks(
        html,
        [
          { anchorText: 'Apparel', href: '/categories/apparel', priority: 10 },
          { anchorText: 'T-Shirts', href: '/categories/t-shirts', priority: 5 },
        ],
        3,
      );

      expect(linked).toContain('<strong><a href="/categories/apparel">Apparel</a></strong>');
      expect(linked).toContain('<a href="/existing">Apparel</a>');
      expect((linked.match(/<a href="\/categories\/apparel">/g) ?? []).length).toBe(1);
    });

    it('caps automated internal links at three per description', () => {
      const html = 'Apparel T-Shirts Hoodies Jackets';
      const linked = embedInternalLinks(
        html,
        [
          { anchorText: 'Apparel', href: '/categories/apparel', priority: 10 },
          { anchorText: 'T-Shirts', href: '/categories/t-shirts', priority: 9 },
          { anchorText: 'Hoodies', href: '/categories/hoodies', priority: 8 },
          { anchorText: 'Jackets', href: '/categories/jackets', priority: 7 },
        ],
        3,
      );

      expect((linked.match(/<a href=/g) ?? []).length).toBe(3);
      expect(linked).not.toContain('/categories/jackets');
    });

    it('does not inject links inside script blocks', () => {
      const html = '<script>var Apparel = true;</script><p>Apparel</p>';
      const linked = embedInternalLinks(
        html,
        [{ anchorText: 'Apparel', href: '/categories/apparel', priority: 1 }],
        3,
      );

      expect(linked).toContain('<script>var Apparel = true;</script>');
      expect(linked).toContain('<p><a href="/categories/apparel">Apparel</a></p>');
    });
  });

  describe('analyzePageSeoHealth', () => {
    it('flags missing canonical, duplicate titles, missing h1, and empty image alt text', () => {
      const html = `
        <html>
          <head>
            <title>Duplicate</title>
            <title>Duplicate</title>
          </head>
          <body>
            <h2>Subheading</h2>
            <img src="/a.png" />
            <img src="/b.png" alt="" />
          </body>
        </html>
      `;
      const findings = analyzePageSeoHealth(html);
      expect(findings.some((finding) => finding.issueType === 'missing_canonical')).toBe(true);
      expect(findings.some((finding) => finding.issueType === 'duplicate_title')).toBe(true);
      expect(findings.some((finding) => finding.issueType === 'missing_h1')).toBe(true);
      expect(findings.some((finding) => finding.issueType === 'empty_image_alt')).toBe(true);
    });
  });

  describe('SeoNotFoundFilter', () => {
    function mockHost(request: Partial<Request>, response: Partial<Response>): ArgumentsHost {
      return {
        switchToHttp: () => ({
          getRequest: () => request as Request,
          getResponse: () => response as Response,
        }),
      } as ArgumentsHost;
    }

    it('logs unknown failures and returns RFC7807 404 when no redirect exists', async () => {
      const logNotFound = vi.fn().mockResolvedValue(undefined);
      const resolve = vi.fn().mockResolvedValue(null);
      const filter = new SeoNotFoundFilter({ logNotFound } as never, { resolve } as never);

      const status = vi.fn().mockReturnThis();
      const type = vi.fn().mockReturnThis();
      const json = vi.fn();
      const response = { status, type, json };
      const request = {
        originalUrl: '/missing-product',
        url: '/missing-product',
        method: 'GET',
        get: vi.fn((header: string) => {
          if (header === 'user-agent') {
            return 'Googlebot';
          }
          if (header === 'host') {
            return 'localhost';
          }
          return undefined;
        }) as Request['get'],
        protocol: 'https',
      };

      await filter.catch(
        new NotFoundException({ message: 'Not found', code: 'PRODUCT_NOT_FOUND' }),
        mockHost(request, response),
      );

      expect(logNotFound).toHaveBeenCalledWith({
        requestPath: '/missing-product',
        httpMethod: 'GET',
        userAgent: 'Googlebot',
      });
      expect(resolve).toHaveBeenCalledWith('/missing-product');
      expect(status).toHaveBeenCalledWith(404);
      expect(type).toHaveBeenCalledWith('application/problem+json');
      expect(json).toHaveBeenCalled();
    });

    it('resolves matching redirect vectors with a 301 instead of rendering a 404', async () => {
      const logNotFound = vi.fn().mockResolvedValue(undefined);
      const resolve = vi.fn().mockResolvedValue({
        sourceUrl: '/old-product',
        targetUrl: '/products/new-id',
        statusCode: 301,
      });
      const filter = new SeoNotFoundFilter({ logNotFound } as never, { resolve } as never);

      const redirect = vi.fn();
      const response = { redirect };
      const request = {
        originalUrl: '/old-product',
        url: '/old-product',
        method: 'GET',
        get: vi.fn((header: string) => {
          if (header === 'user-agent') {
            return 'Googlebot';
          }
          if (header === 'host') {
            return 'localhost';
          }
          return undefined;
        }) as Request['get'],
        protocol: 'https',
      };

      await filter.catch(new NotFoundException('missing'), mockHost(request, response));

      expect(logNotFound).toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith(301, 'https://localhost/products/new-id');
    });
  });
});
