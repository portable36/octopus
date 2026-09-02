import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { AppConfigService } from '../../../config/app-config.service';
import type { ProductFeedItem } from './product-feed.types';
import type { ProductFeedSourcePort } from './product-feed-source.port';

type FeedRow = {
  product_id: string;
  variant_id: string;
  sku: string;
  title: string;
  description: string | null;
  price_minor: number;
  currency_code: string;
  is_available: boolean;
};

@Injectable()
export class CatalogProductFeedSourceAdapter implements ProductFeedSourcePort {
  constructor(
    @Inject(EntityManager) private readonly em: EntityManager,
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  public async *streamItems(batchSize: number): AsyncGenerator<readonly ProductFeedItem[]> {
    const siteUrl = this.config.seoPublicSiteUrl.replace(/\/$/, '');
    let offset = 0;

    while (true) {
      const rows = await this.em.getConnection().execute<FeedRow[]>(
        `
          select
            p.id as product_id,
            v.id as variant_id,
            coalesce(nullif(v.sku, ''), p.sku) as sku,
            p.name as title,
            p.description,
            o.price_minor,
            o.currency_code,
            o.is_available
          from catalog_products p
          inner join catalog_variants v on v.product_id = p.id
          inner join catalog_store_offers o on o.variant_id = v.id
          where p.status = 'published'
            and v.status = 'active'
            and o.status = 'active'
          order by p.id asc, v.id asc
          limit ? offset ?
        `,
        [batchSize, offset],
      );

      if (rows.length === 0) {
        return;
      }

      yield rows.map((row: FeedRow) => this.toFeedItem(row, siteUrl));
      offset += rows.length;
    }
  }

  private toFeedItem(row: FeedRow, siteUrl: string): ProductFeedItem {
    return {
      productId: row.product_id,
      variantId: row.variant_id,
      sku: row.sku,
      title: row.title,
      description: row.description?.trim() || row.title,
      link: `${siteUrl}/products/${row.product_id}`,
      priceMinor: row.price_minor,
      currencyCode: row.currency_code,
      availability: row.is_available ? 'in_stock' : 'out_of_stock',
      condition: 'new',
    };
  }
}
