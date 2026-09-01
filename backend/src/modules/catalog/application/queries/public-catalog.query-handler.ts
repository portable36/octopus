import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  MEDIA_ASSET_ACCESS,
  type MediaAssetAccessPort,
} from '../../../../shared-kernel/application/ports/media-asset-access.port';
import {
  STORE_ACCESS,
  type StoreAccessPort,
} from '../../../../shared-kernel/application/ports/store-access.port';
import {
  VENDOR_ACCESS,
  type VendorAccessPort,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
import {
  CATEGORY_REPOSITORY,
  type CategoryRepository,
} from '../ports/category-repository.interface';
import { PRODUCT_REPOSITORY, type ProductRepository } from '../ports/product-repository.interface';
import {
  STORE_OFFER_REPOSITORY,
  type StoreOfferRepository,
} from '../ports/store-offer-repository.interface';
import { VARIANT_REPOSITORY, type VariantRepository } from '../ports/variant-repository.interface';
import { toStorefrontProductDto } from '../mappers/catalog-response.mapper';

@Injectable()
export class PublicCatalogQueryHandler {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(VARIANT_REPOSITORY) private readonly variants: VariantRepository,
    @Inject(STORE_OFFER_REPOSITORY) private readonly offers: StoreOfferRepository,
    @Inject(STORE_ACCESS) private readonly stores: StoreAccessPort,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
    @Inject(MEDIA_ASSET_ACCESS) private readonly mediaAccess: MediaAssetAccessPort,
  ) {}

  public async listCategories() {
    const items = await this.categories.listActive();
    return items.map((c) => ({
      id: c.id.value,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId,
      sortOrder: c.sortOrder,
      seo: c.seo,
    }));
  }

  public async getCategoryBySlug(slug: string) {
    const category = await this.categories.findActiveBySlug(slug);
    if (!category) {
      throw new NotFoundException({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'Category not found.',
        code: 'CATEGORY_NOT_FOUND',
      });
    }
    return {
      id: category.id.value,
      name: category.name,
      slug: category.slug,
      parentId: category.parentId,
      sortOrder: category.sortOrder,
      seo: category.seo,
    };
  }

  public async getPublishedProduct(productId: string) {
    const product = await this.products.findPublishedById(productId);
    if (!product) {
      throw new NotFoundException({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'Product not found.',
        code: 'PRODUCT_NOT_FOUND',
      });
    }
    const variants = await this.variants.findByProductId(productId);
    const offers = await this.offers.findActiveByProductId(productId);
    const mediaUrls = await this.resolveMediaUrls([
      ...product.media.map((item) => item.mediaId),
      ...variants.flatMap((variant) => variant.media.map((item) => item.mediaId)),
    ]);
    return toStorefrontProductDto({
      product,
      variants,
      offers,
      slug: slugify(product.name),
      mediaUrls,
    });
  }

  public async getActiveStoreBySlug(slug: string, vendorId?: string) {
    const store = await this.stores.findActiveBySlug(slug, vendorId);
    if (!store) {
      throw new NotFoundException({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'Store not found.',
        code: 'STORE_NOT_FOUND',
      });
    }
    const vendor = await this.vendors.findActivePublicById(store.vendorId);
    return {
      id: store.storeId,
      vendorId: store.vendorId,
      vendorSlug: vendor?.slug ?? null,
      slug: store.slug,
      displayName: store.displayName,
      description: store.description,
      currencyCode: store.currencyCode,
      acceptsOnlineOrders: store.acceptsOnlineOrders,
    };
  }

  public async getActiveVendorShopBySlug(slug: string) {
    const vendor = await this.vendors.findActivePublicBySlug(slug);
    if (!vendor) {
      throw new NotFoundException({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'Vendor shop not found.',
        code: 'VENDOR_NOT_FOUND',
      });
    }
    const stores = await this.stores.listActiveByVendorId(vendor.vendorId);
    return {
      id: vendor.vendorId,
      slug: vendor.slug,
      displayName: vendor.displayName,
      description: vendor.description,
      stores: stores.map((store) => ({
        id: store.storeId,
        slug: store.slug,
        displayName: store.displayName,
        description: store.description,
        currencyCode: store.currencyCode,
        acceptsOnlineOrders: store.acceptsOnlineOrders,
      })),
    };
  }

  /** Sitemap entries from catalog DB (published only) — never Meilisearch. */
  public async listSitemapProducts() {
    const items = await this.products.listPublishedSitemapEntries();
    return items.map((item) => ({
      id: item.id,
      updatedAt: item.updatedAt.toISOString(),
    }));
  }

  private async resolveMediaUrls(mediaIds: readonly string[]): Promise<Map<string, string | null>> {
    const urls = new Map<string, string | null>();
    const uniqueIds = [...new Set(mediaIds)];
    await Promise.all(
      uniqueIds.map(async (mediaId) => {
        const resolved = await this.mediaAccess.resolvePublicImageUrl(mediaId);
        urls.set(mediaId, resolved?.url ?? null);
      }),
    );
    return urls;
  }
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'product';
}
