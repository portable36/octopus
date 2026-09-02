import { Injectable, NotFoundException } from '@nestjs/common';
import type { StructuredData } from '../../domain/seo.types';
import { parsePublicSeoPath } from '../../domain/parse-seo-path';
import { CatalogSeoFactsAdapter } from '../../infrastructure/access/catalog-seo-facts.adapter';
import { StructuredDataEngine } from '../../structured-data/structured-data.engine';
import { SemanticSeoService } from './semantic-seo.service';
import { SeoMetadataService } from './seo-metadata.service';

export type PublicSeoResolveResponse = {
  readonly path: string;
  readonly metadata: Awaited<ReturnType<SeoMetadataService['resolve']>>;
  readonly structuredData: readonly StructuredData[];
};

@Injectable()
export class SeoPageResolveService {
  constructor(
    private readonly facts: CatalogSeoFactsAdapter,
    private readonly metadata: SeoMetadataService,
    private readonly structuredData: StructuredDataEngine,
    private readonly semanticSeo: SemanticSeoService,
  ) {}

  public async resolveByPath(path: string): Promise<PublicSeoResolveResponse> {
    const parsed = parsePublicSeoPath(path);
    if (!parsed) {
      throw new NotFoundException({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'SEO path is not supported.',
        code: 'SEO_PATH_NOT_SUPPORTED',
      });
    }

    const siteUrl = this.facts.siteUrl();

    if (parsed.kind === 'product') {
      const product = await this.facts.findProductById(parsed.productId);
      if (!product) {
        throw new NotFoundException({
          type: 'about:blank',
          title: 'Not Found',
          status: 404,
          detail: 'Product not found.',
          code: 'PRODUCT_NOT_FOUND',
        });
      }

      const canonicalUrl = `${siteUrl}/products/${product.id}`;
      const enrichedDescription = await this.semanticSeo.enrichDescriptionWithInternalLinks(
        product.description,
      );
      const resolvedMetadata = await this.metadata.resolve({
        entityType: 'product',
        entityId: product.id,
        defaults: {
          title: product.name,
          description:
            enrichedDescription?.trim().slice(0, 300) ||
            `${product.name} on ${new URL(siteUrl).hostname}`,
          canonicalUrl,
        },
      });

      const structured: StructuredData[] = [
        this.structuredData.buildBreadcrumbList([
          { name: 'Home', url: `${siteUrl}/` },
          { name: 'Search', url: `${siteUrl}/search` },
          { name: product.name, url: canonicalUrl },
        ]),
        this.structuredData.buildProduct({
          name: product.name,
          sku: product.sku,
          url: canonicalUrl,
          ...(enrichedDescription ? { description: enrichedDescription } : {}),
          ...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
          offers: product.offers.map((offer) => ({
            priceMinor: offer.priceMinor,
            currencyCode: offer.currencyCode,
            availability: offer.isAvailable ? 'in_stock' : 'out_of_stock',
            url: canonicalUrl,
            sku: offer.sku,
          })),
        }),
      ];

      return { path, metadata: resolvedMetadata, structuredData: structured };
    }

    if (parsed.kind === 'category') {
      const category = await this.facts.findCategoryBySlug(parsed.slug);
      if (!category) {
        throw new NotFoundException({
          type: 'about:blank',
          title: 'Not Found',
          status: 404,
          detail: 'Category not found.',
          code: 'CATEGORY_NOT_FOUND',
        });
      }

      const canonicalUrl = `${siteUrl}/categories/${category.slug}`;
      const enrichedDescription = await this.semanticSeo.enrichDescriptionWithInternalLinks(
        category.seoDescription,
      );
      const resolvedMetadata = await this.metadata.resolve({
        entityType: 'category',
        entityId: category.id,
        defaults: {
          title: category.seoTitle?.trim() || category.name,
          description:
            enrichedDescription?.trim() ||
            `${category.name} on ${new URL(siteUrl).hostname}`,
          canonicalUrl,
        },
      });

      const structured: StructuredData[] = [
        this.structuredData.buildBreadcrumbList([
          { name: 'Home', url: `${siteUrl}/` },
          { name: 'Categories', url: `${siteUrl}/categories` },
          { name: category.name, url: canonicalUrl },
        ]),
      ];

      return { path, metadata: resolvedMetadata, structuredData: structured };
    }

    const title = this.facts.cmsTitleFromSlug(parsed.slug);
    const canonicalUrl = `${siteUrl}/pages/${parsed.slug}`;
    const resolvedMetadata = await this.metadata.resolve({
      entityType: 'cms',
      entityId: parsed.entityId,
      defaults: {
        title,
        description: `${title} on ${new URL(siteUrl).hostname}`,
        canonicalUrl,
      },
    });

    const structured: StructuredData[] = [
      this.structuredData.buildBreadcrumbList([
        { name: 'Home', url: `${siteUrl}/` },
        { name: title, url: canonicalUrl },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: resolvedMetadata.title,
        description: resolvedMetadata.description,
        url: canonicalUrl,
      },
    ];

    return { path, metadata: resolvedMetadata, structuredData: structured };
  }
}
