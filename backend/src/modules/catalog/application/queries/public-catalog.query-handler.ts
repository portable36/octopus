import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  STORE_ACCESS,
  type StoreAccessPort,
} from '../../../../shared-kernel/application/ports/store-access.port';
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

@Injectable()
export class PublicCatalogQueryHandler {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(VARIANT_REPOSITORY) private readonly variants: VariantRepository,
    @Inject(STORE_OFFER_REPOSITORY) private readonly offers: StoreOfferRepository,
    @Inject(STORE_ACCESS) private readonly stores: StoreAccessPort,
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
    return {
      id: product.id.value,
      vendorId: product.vendorId,
      name: product.name,
      description: product.description,
      brandId: product.brandId,
      categoryIds: product.categoryIds,
      media: product.media,
      slug: slugify(product.name),
      variants: variants.map((v) => ({
        id: v.id.value,
        sku: v.sku,
        name: v.name,
        status: v.status,
        media: v.media,
      })),
      offers: offers.map((o) => ({
        id: o.id.value,
        storeId: o.storeId,
        variantId: o.variantId,
        priceMinor: o.priceMinor,
        currencyCode: o.currencyCode,
        isAvailable: o.isAvailable,
      })),
    };
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
    return {
      id: store.storeId,
      vendorId: store.vendorId,
      slug: store.slug,
      displayName: store.displayName,
      description: store.description,
      currencyCode: store.currencyCode,
      acceptsOnlineOrders: store.acceptsOnlineOrders,
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
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'product';
}
