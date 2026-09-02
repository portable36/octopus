import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { AppConfigService } from '../../../../config/app-config.service';
import type { InternalLinkTarget } from '../../domain/embed-internal-links';

type CategoryRow = { name: string; slug: string };
type BrandTagRow = { tag: string; usage_count: number };

@Injectable()
export class CatalogInternalLinkSourceAdapter {
  constructor(
    @Inject(EntityManager) private readonly em: EntityManager,
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  public async listLinkTargets(limit = 200): Promise<readonly InternalLinkTarget[]> {
    const siteUrl = this.config.seoPublicSiteUrl.replace(/\/$/, '');
    const [categories, brandTags] = await Promise.all([
      this.loadCategoryTargets(siteUrl, limit),
      this.loadBrandTagTargets(siteUrl, Math.max(20, Math.floor(limit / 4))),
    ]);
    return [...categories, ...brandTags];
  }

  private async loadCategoryTargets(
    siteUrl: string,
    limit: number,
  ): Promise<readonly InternalLinkTarget[]> {
    const rows = await this.em.getConnection().execute<CategoryRow[]>(
      `
        select name, slug
        from catalog_categories
        where status = 'active'
        order by name asc
        limit ?
      `,
      [limit],
    );

    return rows.map((row: CategoryRow, index: number) => ({
      anchorText: row.name,
      href: `${siteUrl}/categories/${row.slug}`,
      priority: limit - index,
    }));
  }

  private async loadBrandTagTargets(
    siteUrl: string,
    limit: number,
  ): Promise<readonly InternalLinkTarget[]> {
    const rows = await this.em.getConnection().execute<BrandTagRow[]>(
      `
        select lower(trim(attr->>'value')) as tag, count(*)::int as usage_count
        from catalog_products p
        cross join lateral json_array_elements(coalesce(p.attributes, '[]'::json)) as attr
        where p.status = 'published'
          and lower(attr->>'code') in ('brand', 'brand_name', 'manufacturer')
          and trim(coalesce(attr->>'value', '')) <> ''
        group by tag
        order by usage_count desc, tag asc
        limit ?
      `,
      [limit],
    );

    return rows.map((row: BrandTagRow) => ({
      anchorText: row.tag,
      href: `${siteUrl}/search?q=${encodeURIComponent(row.tag)}`,
      priority: row.usage_count,
    }));
  }
}
