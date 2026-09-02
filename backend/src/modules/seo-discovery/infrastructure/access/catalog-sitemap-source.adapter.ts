import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { AppConfigService } from '../../../../config/app-config.service';
import type {
  SitemapSourcePort,
  SitemapUrlEntry,
} from '../../application/ports/sitemap-source.port';

type ProductRow = { id: string; updated_at: Date };
type CategoryRow = { slug: string; updated_at: Date };

@Injectable()
export class CatalogSitemapSourceAdapter implements SitemapSourcePort {
  constructor(
    private readonly em: EntityManager,
    private readonly config: AppConfigService,
  ) {}

  public async *streamEntries(batchSize: number): AsyncGenerator<readonly SitemapUrlEntry[]> {
    const siteUrl = this.config.seoPublicSiteUrl.replace(/\/$/, '');

    yield [
      { loc: `${siteUrl}/`, changefreq: 'daily', priority: 1 },
      { loc: `${siteUrl}/categories`, changefreq: 'daily', priority: 0.8 },
    ];

    yield* this.streamCategories(siteUrl, batchSize);
    yield* this.streamProducts(siteUrl, batchSize);
  }

  private async *streamCategories(
    siteUrl: string,
    batchSize: number,
  ): AsyncGenerator<readonly SitemapUrlEntry[]> {
    let offset = 0;
    while (true) {
      const rows = await this.em.getConnection().execute<CategoryRow[]>(
        `
          select slug, updated_at
          from catalog_categories
          where status = 'active'
          order by slug asc
          limit ? offset ?
        `,
        [batchSize, offset],
      );
      if (rows.length === 0) {
        return;
      }
      yield rows.map((row: CategoryRow) => ({
        loc: `${siteUrl}/categories/${row.slug}`,
        lastmod: new Date(row.updated_at).toISOString(),
        changefreq: 'daily' as const,
        priority: 0.7,
      }));
      offset += rows.length;
    }
  }

  private async *streamProducts(
    siteUrl: string,
    batchSize: number,
  ): AsyncGenerator<readonly SitemapUrlEntry[]> {
    let offset = 0;
    while (true) {
      const rows = await this.em.getConnection().execute<ProductRow[]>(
        `
          select id, updated_at
          from catalog_products
          where status = 'published'
          order by id asc
          limit ? offset ?
        `,
        [batchSize, offset],
      );
      if (rows.length === 0) {
        return;
      }
      yield rows.map((row: ProductRow) => ({
        loc: `${siteUrl}/products/${row.id}`,
        lastmod: new Date(row.updated_at).toISOString(),
        changefreq: 'daily' as const,
        priority: 0.6,
      }));
      offset += rows.length;
    }
  }
}
