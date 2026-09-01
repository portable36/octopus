import { Inject, Injectable } from '@nestjs/common';
import {
  STORE_ACCESS,
  type StoreAccessPort,
} from '../../../../shared-kernel/application/ports/store-access.port';
import type { Product } from '../../domain/aggregates/product.aggregate';
import type { StoreOffer } from '../../domain/aggregates/store-offer.aggregate';
import type { Variant } from '../../domain/aggregates/variant.aggregate';
import { CatalogApplicationError, ProductNotFoundError } from '../errors/catalog.errors';
import { PRODUCT_REPOSITORY, type ProductRepository } from '../ports/product-repository.interface';
import {
  STORE_OFFER_REPOSITORY,
  type StoreOfferRepository,
} from '../ports/store-offer-repository.interface';
import { VARIANT_REPOSITORY, type VariantRepository } from '../ports/variant-repository.interface';
import { CatalogAuthorizationService } from '../services/catalog-authorization.service';

@Injectable()
export class ListProductVariantsHandler {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(VARIANT_REPOSITORY) private readonly variants: VariantRepository,
    @Inject(CatalogAuthorizationService) private readonly authz: CatalogAuthorizationService,
  ) {}

  public async execute(
    productId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Variant[]> {
    const product = await this.requireReadableProduct(productId, actorUserId, actorRoles);
    return this.variants.findByProductId(product.id.value);
  }

  private async requireReadableProduct(
    productId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Product> {
    const product = await this.products.findById(productId);
    if (!product) {
      throw new ProductNotFoundError();
    }
    if (product.status === 'published' || actorRoles.includes('PLATFORM_ADMIN')) {
      return product;
    }
    const vendor = await this.authz.requireActiveVendor(product.vendorId);
    this.authz.assertCanMutate(vendor, actorUserId, actorRoles);
    return product;
  }
}

@Injectable()
export class ListStoreOffersHandler {
  constructor(
    @Inject(STORE_OFFER_REPOSITORY) private readonly offers: StoreOfferRepository,
    @Inject(STORE_ACCESS) private readonly stores: StoreAccessPort,
    @Inject(CatalogAuthorizationService) private readonly authz: CatalogAuthorizationService,
  ) {}

  public async execute(input: {
    readonly storeId: string;
    readonly productId?: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<StoreOffer[]> {
    const store = await this.stores.findById(input.storeId);
    if (!store) {
      throw new CatalogApplicationError('Store not found.', 'STORE_NOT_FOUND');
    }
    const vendor = await this.authz.requireActiveVendor(store.vendorId);
    this.authz.assertCanMutate(vendor, input.actorUserId, input.actorRoles);

    if (input.productId) {
      return this.offers.findByStoreAndProductId(input.storeId, input.productId);
    }
    return this.offers.findByStoreId(input.storeId);
  }
}
