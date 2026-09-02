import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../config/app-config.service';
import { escapeXml } from '../application/services/sitemap-xml.renderer';
import { PRODUCT_FEED_SOURCE, type ProductFeedSourcePort } from './product-feed-source.port';
import type { ProductFeedItem } from './product-feed.types';
import { SeoArtifactStoreService } from './seo-artifact-store.service';

const DEFAULT_BATCH_SIZE = 250;

@Injectable()
export class ProductFeedService {
  constructor(
    @Inject(PRODUCT_FEED_SOURCE) private readonly source: ProductFeedSourcePort,
    private readonly artifacts: SeoArtifactStoreService,
    private readonly config: AppConfigService,
  ) {}

  public async generateAll(batchSize = DEFAULT_BATCH_SIZE): Promise<{
    readonly googleXmlPath: string;
    readonly metaJsonPath: string;
    readonly itemCount: number;
  }> {
    const googleParts: string[] = [this.googleFeedHeader()];
    const metaItems: Record<string, unknown>[] = [];
    let itemCount = 0;

    for await (const batch of this.source.streamItems(batchSize)) {
      for (const item of batch) {
        googleParts.push(this.renderGoogleItem(item));
        metaItems.push(this.renderMetaItem(item));
        itemCount += 1;
      }
    }

    googleParts.push('</channel>\n</rss>\n');
    const googleXmlPath = await this.artifacts.writeFeed(
      'google-products.xml',
      googleParts.join(''),
    );
    const metaJsonPath = await this.artifacts.writeFeed(
      'meta-catalog.json',
      JSON.stringify({ data: metaItems }, null, 2),
    );

    return { googleXmlPath, metaJsonPath, itemCount };
  }

  private googleFeedHeader(): string {
    const siteUrl = this.config.seoPublicSiteUrl.replace(/\/$/, '');
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">',
      '<channel>',
      `<title>${escapeXml(this.config.seoPublicSiteUrl)}</title>`,
      `<link>${escapeXml(siteUrl)}</link>`,
      '<description>Product catalog feed</description>',
    ].join('\n');
  }

  private renderGoogleItem(item: ProductFeedItem): string {
    return [
      '<item>',
      `<g:id>${escapeXml(item.sku)}</g:id>`,
      `<g:title>${escapeXml(item.title)}</g:title>`,
      `<g:description>${escapeXml(item.description.slice(0, 5000))}</g:description>`,
      `<g:link>${escapeXml(item.link)}</g:link>`,
      `<g:condition>${item.condition}</g:condition>`,
      `<g:availability>${this.toGoogleAvailability(item.availability)}</g:availability>`,
      `<g:price>${this.formatPrice(item.priceMinor, item.currencyCode)}</g:price>`,
      '</item>',
    ].join('');
  }

  private renderMetaItem(item: ProductFeedItem): Record<string, unknown> {
    return {
      id: item.sku,
      title: item.title,
      description: item.description.slice(0, 5000),
      availability: item.availability === 'in_stock' ? 'in stock' : 'out of stock',
      condition: item.condition,
      price: this.formatPrice(item.priceMinor, item.currencyCode),
      link: item.link,
    };
  }

  private formatPrice(priceMinor: number, currencyCode: string): string {
    return `${(priceMinor / 100).toFixed(2)} ${currencyCode}`;
  }

  private toGoogleAvailability(availability: ProductFeedItem['availability']): string {
    return availability === 'in_stock' ? 'in stock' : 'out of stock';
  }
}
