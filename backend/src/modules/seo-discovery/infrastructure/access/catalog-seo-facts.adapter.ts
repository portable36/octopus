import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { AppConfigService } from '../../../../config/app-config.service';
import {
  type CatalogSeoFactsPort,
  type ProductSeoFacts,
  type CategorySeoFacts,
} from '../../application/ports/catalog-seo-facts.port';

export type { ProductSeoFacts, CategorySeoFacts };

type OfferRow = {
  sku: string;
  price_minor: number;
  currency_code: string;
  is_available: boolean;
};

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  sku: string;
};

@Injectable()
export class CatalogSeoFactsAdapter implements CatalogSeoFactsPort {
  constructor(
    @Inject(EntityManager) private readonly em: EntityManager,
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  public async findProductById(productId: string): Promise<ProductSeoFacts | null> {
    const rows = await this.em.getConnection().execute<ProductRow[]>(
      `
        select id, name, description, sku
        from catalog_products
        where id = ? and status = 'published'
        limit 1
      `,
      [productId],
    );
    const product = rows[0];
    if (!product) {
      return null;
    }

    const offerRows = await this.em.getConnection().execute<OfferRow[]>(
      `
        select
          coalesce(nullif(v.sku, ''), p.sku) as sku,
          o.price_minor,
          o.currency_code,
          o.is_available
        from catalog_store_offers o
        inner join catalog_variants v on v.id = o.variant_id
        inner join catalog_products p on p.id = o.product_id
        where o.product_id = ?
          and o.status = 'active'
          and v.status = 'active'
        order by o.price_minor asc
      `,
      [productId],
    );

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      imageUrl: null,
      offers: offerRows.map((row: OfferRow) => ({
        sku: row.sku,
        priceMinor: row.price_minor,
        currencyCode: row.currency_code,
        isAvailable: row.is_available,
      })),
    };
  }

  public async findCategoryBySlug(slug: string): Promise<CategorySeoFacts | null> {
    const rows = await this.em.getConnection().execute<
      {
        id: string;
        name: string;
        slug: string;
        seo_title: string | null;
        seo_description: string | null;
      }[]
    >(
      `
        select id, name, slug, seo_title, seo_description
        from catalog_categories
        where slug = ? and status = 'active'
        limit 1
      `,
      [slug],
    );
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      seoTitle: row.seo_title,
      seoDescription: row.seo_description,
    };
  }

  public cmsTitleFromSlug(slug: string): string {
    return slug
      .split('-')
      .filter((part) => part.length > 0)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  public siteUrl(): string {
    return this.config.seoPublicSiteUrl.replace(/\/$/, '');
  }
}
