import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import { AppConfigService } from '../../../../config/app-config.service';
import {
  analyzePageSeoHealth,
  extractTitleTags,
  type SeoHealthIssueFinding,
} from '../../domain/analyze-page-seo-health';
import { SeoHealthIssue } from '../../infrastructure/entities/seo-health-issue.entity';
import { assertAllowedOutboundUrl } from '../../../../shared-kernel/infrastructure/security/assert-allowed-outbound-url';

const MAX_ROUTES = 500;
const FETCH_TIMEOUT_MS = 8_000;

type ProductRouteRow = { id: string };

@Injectable()
export class SeoHealthVerificationService {
  private readonly logger = new Logger(SeoHealthVerificationService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly config: AppConfigService,
  ) {}

  public async verifyTopProductRoutes(): Promise<{ readonly scanned: number; readonly issues: number }> {
    const siteUrl = this.config.seoPublicSiteUrl.replace(/\/$/, '');
    const routes = await this.listTopProductRoutes(MAX_ROUTES);
    const titleCounts = new Map<string, number>();
    const pages: Array<
      | { readonly url: string; readonly html: string }
      | { readonly url: string; readonly fetchError: string }
    > = [];

    const siteHost = new URL(siteUrl).hostname;

    for (const route of routes) {
      const url = `${siteUrl}/products/${route.id}`;
      try {
        assertAllowedOutboundUrl(url, [siteHost], {
          requireHttps: siteUrl.startsWith('https://'),
        });
        const html = await this.fetchHtml(url);
        for (const title of extractTitleTags(html)) {
          titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1);
        }
        pages.push({ url, html });
      } catch (error) {
        pages.push({
          url,
          fetchError: error instanceof Error ? error.message : 'Failed to fetch page.',
        });
      }
    }

    const scannedAt = new Date();
    const issues: SeoHealthIssue[] = [];

    for (const page of pages) {
      const findings: readonly SeoHealthIssueFinding[] =
        'fetchError' in page
          ? [
              {
                issueType: 'fetch_failed',
                severity: 'error',
                detail: page.fetchError,
              },
            ]
          : analyzePageSeoHealth(page.html, { titleCounts });

      for (const finding of findings) {
        issues.push(
          this.em.create(SeoHealthIssue, {
            id: randomUUID(),
            url: page.url,
            issueType: finding.issueType,
            severity: finding.severity,
            detail: finding.detail,
            scannedAt,
          }),
        );
      }
    }

    await this.em.transactional(async (tx) => {
      await tx.nativeDelete(SeoHealthIssue, {});
      for (const issue of issues) {
        tx.persist(issue);
      }
    });

    this.logger.log(`SEO health verification complete: ${routes.length} routes, ${issues.length} issues.`);
    return { scanned: routes.length, issues: issues.length };
  }

  public async countOpenIssues(): Promise<number> {
    return this.em.count(SeoHealthIssue, {});
  }

  public async latestScanAt(): Promise<Date | null> {
    const [latest] = await this.em.find(
      SeoHealthIssue,
      {},
      { orderBy: { scannedAt: 'desc' }, limit: 1 },
    );
    return latest?.scannedAt ?? null;
  }

  public async listIssues(limit = 100): Promise<
    readonly {
      readonly id: string;
      readonly url: string;
      readonly issueType: string;
      readonly severity: string;
      readonly detail: string;
      readonly scannedAt: Date;
    }[]
  > {
    const rows = await this.em.find(
      SeoHealthIssue,
      {},
      { orderBy: { scannedAt: 'desc', severity: 'desc' }, limit: Math.min(500, limit) },
    );
    return rows.map((row) => ({
      id: row.id,
      url: row.url,
      issueType: row.issueType,
      severity: row.severity,
      detail: row.detail,
      scannedAt: row.scannedAt,
    }));
  }

  private async listTopProductRoutes(limit: number): Promise<readonly ProductRouteRow[]> {
    return this.em.getConnection().execute<ProductRouteRow[]>(
      `
        select id
        from catalog_products
        where status = 'published'
        order by updated_at desc
        limit ?
      `,
      [limit],
    );
  }

  private async fetchHtml(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'text/html' },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.text();
    } finally {
      clearTimeout(timeout);
    }
  }
}
