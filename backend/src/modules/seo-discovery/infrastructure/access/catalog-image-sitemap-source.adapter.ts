import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { AppConfigService } from '../../../../config/app-config.service';
import {
  MEDIA_ASSET_ACCESS,
  type MediaAssetAccessPort,
} from '../../../../shared-kernel/application/ports/media-asset-access.port';
import type {
  ImageSitemapImageEntry,
  ImageSitemapSourcePort,
  ImageSitemapUrlEntry,
} from '../../application/ports/image-sitemap-source.port';

type ProductRow = {
  id: string;
  name: string;
  media: unknown;
};

type VariantRow = {
  product_id: string;
  name: string;
  media: unknown;
};

type ImageMediaRef = {
  readonly mediaId: string;
  readonly mediaType: string;
};

function parseImageMediaRefs(raw: unknown): readonly ImageMediaRef[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((entry): entry is ImageMediaRef => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }
    const record = entry as Record<string, unknown>;
    return record['mediaType'] === 'IMAGE' && typeof record['mediaId'] === 'string';
  });
}

@Injectable()
export class CatalogImageSitemapSourceAdapter implements ImageSitemapSourcePort {
  constructor(
    private readonly em: EntityManager,
    private readonly config: AppConfigService,
    @Inject(MEDIA_ASSET_ACCESS) private readonly mediaAccess: MediaAssetAccessPort,
  ) {}

  public async *streamEntries(batchSize: number): AsyncGenerator<readonly ImageSitemapUrlEntry[]> {
    const take = Math.min(200, Math.max(1, batchSize));
    const siteUrl = this.config.seoPublicSiteUrl.replace(/\/$/, '');
    let offset = 0;

    while (true) {
      const products = await this.em.getConnection().execute<ProductRow[]>(
        `
          select id, name, media
          from catalog_products
          where status = 'published'
          order by id asc
          limit ? offset ?
        `,
        [take, offset],
      );
      if (products.length === 0) {
        return;
      }

      const productIds = products.map((product: ProductRow) => product.id);
      const variants = await this.em.getConnection().execute<VariantRow[]>(
        `
          select product_id, name, media
          from catalog_variants
          where status = 'active'
            and product_id in (${productIds.map(() => '?').join(', ')})
        `,
        productIds,
      );

      const variantsByProduct = new Map<string, VariantRow[]>();
      for (const variant of variants) {
        const bucket = variantsByProduct.get(variant.product_id) ?? [];
        bucket.push(variant);
        variantsByProduct.set(variant.product_id, bucket);
      }

      const entries: ImageSitemapUrlEntry[] = [];
      for (const product of products) {
        const images = await this.collectImages(
          product.name,
          parseImageMediaRefs(product.media),
          variantsByProduct.get(product.id) ?? [],
        );
        if (images.length === 0) {
          continue;
        }
        entries.push({
          loc: `${siteUrl}/products/${product.id}`,
          images,
        });
      }

      if (entries.length > 0) {
        yield entries;
      }

      offset += products.length;
    }
  }

  private async collectImages(
    productName: string,
    productMedia: readonly ImageMediaRef[],
    variants: readonly VariantRow[],
  ): Promise<readonly ImageSitemapImageEntry[]> {
    const pending: Array<{ readonly mediaId: string; readonly title: string }> = [];

    for (const media of productMedia) {
      pending.push({ mediaId: media.mediaId, title: productName });
    }

    for (const variant of variants) {
      for (const media of parseImageMediaRefs(variant.media)) {
        const title =
          variant.name.trim() && variant.name.trim() !== productName
            ? `${productName} - ${variant.name.trim()}`
            : productName;
        pending.push({ mediaId: media.mediaId, title });
      }
    }

    const seenMediaIds = new Set<string>();
    const resolved: ImageSitemapImageEntry[] = [];

    for (const item of pending) {
      if (seenMediaIds.has(item.mediaId)) {
        continue;
      }
      seenMediaIds.add(item.mediaId);

      const snapshot = await this.mediaAccess.resolvePublicImageUrl(item.mediaId);
      if (!snapshot?.url) {
        continue;
      }
      resolved.push({
        imageLoc: snapshot.url,
        title: item.title,
      });
    }

    return resolved;
  }
}
