import { Inject, Injectable } from '@nestjs/common';
import {
  STORE_ACCESS,
  type StoreAccessPort,
} from '../../../../shared-kernel/application/ports/store-access.port';
import { StoreOffer } from '../../domain/aggregates/store-offer.aggregate';
import {
  CatalogApplicationError,
  ProductNotFoundError,
  StoreOfferNotFoundError,
  StoreOfferNotSellableError,
  VariantNotFoundError,
} from '../errors/catalog.errors';
import { PRODUCT_REPOSITORY, type ProductRepository } from '../ports/product-repository.interface';
import {
  STORE_OFFER_REPOSITORY,
  type StoreOfferRepository,
} from '../ports/store-offer-repository.interface';
import { VARIANT_REPOSITORY, type VariantRepository } from '../ports/variant-repository.interface';
import { CatalogAuthorizationService } from '../services/catalog-authorization.service';

@Injectable()
export class CreateStoreOfferHandler {
  constructor(
    @Inject(STORE_OFFER_REPOSITORY) private readonly offers: StoreOfferRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(VARIANT_REPOSITORY) private readonly variants: VariantRepository,
    @Inject(STORE_ACCESS) private readonly stores: StoreAccessPort,
    @Inject(CatalogAuthorizationService) private readonly authz: CatalogAuthorizationService,
  ) {}

  public async execute(input: {
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly storeId: string;
    readonly variantId: string;
    readonly priceMinor: number;
    readonly currencyCode: string;
  }): Promise<StoreOffer> {
    const store = await this.stores.findById(input.storeId);
    if (!store) {
      throw new CatalogApplicationError('Store not found.', 'STORE_NOT_FOUND');
    }
    const vendor = await this.authz.requireActiveVendor(store.vendorId);
    this.authz.assertCanMutate(vendor, input.actorUserId, input.actorRoles);

    const variant = await this.variants.findById(input.variantId);
    if (!variant) {
      throw new VariantNotFoundError();
    }
    const product = await this.products.findById(variant.productId);
    if (!product) {
      throw new ProductNotFoundError();
    }
    if (product.vendorId !== store.vendorId) {
      throw new CatalogApplicationError(
        'Variant does not belong to the store vendor.',
        'STORE_OFFER_VENDOR_MISMATCH',
      );
    }
    if (await this.offers.existsByStoreAndVariant(input.storeId, input.variantId)) {
      throw new CatalogApplicationError(
        'Store already has an offer for this variant.',
        'STORE_OFFER_EXISTS',
      );
    }

    const offer = StoreOffer.create({
      vendorId: store.vendorId,
      storeId: store.storeId,
      productId: product.id.value,
      variantId: variant.id.value,
      priceMinor: input.priceMinor,
      currencyCode: input.currencyCode,
    });
    await this.offers.save(offer);
    return offer;
  }
}

@Injectable()
export class StoreOfferLifecycleHandler {
  constructor(
    @Inject(STORE_OFFER_REPOSITORY) private readonly offers: StoreOfferRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(VARIANT_REPOSITORY) private readonly variants: VariantRepository,
    @Inject(CatalogAuthorizationService) private readonly authz: CatalogAuthorizationService,
  ) {}

  public async activate(
    offerId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<StoreOffer> {
    const offer = await this.requireOwned(offerId, actorUserId, actorRoles);
    const product = await this.products.findById(offer.productId);
    if (!product || product.status !== 'published') {
      throw new StoreOfferNotSellableError('Cannot activate offer: product must be published.');
    }
    const variant = await this.variants.findById(offer.variantId);
    if (!variant || variant.status !== 'ACTIVE') {
      throw new StoreOfferNotSellableError('Cannot activate offer: variant must be active.');
    }
    offer.activate();
    await this.offers.save(offer);
    return offer;
  }

  public async suspend(
    offerId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<StoreOffer> {
    const offer = await this.requireOwned(offerId, actorUserId, actorRoles);
    offer.suspend();
    await this.offers.save(offer);
    return offer;
  }

  public async updatePrice(
    offerId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    priceMinor: number,
    currencyCode?: string,
  ): Promise<StoreOffer> {
    const offer = await this.requireOwned(offerId, actorUserId, actorRoles);
    offer.updatePrice(priceMinor, currencyCode);
    await this.offers.save(offer);
    return offer;
  }

  private async requireOwned(
    offerId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<StoreOffer> {
    const offer = await this.offers.findById(offerId);
    if (!offer) {
      throw new StoreOfferNotFoundError();
    }
    const vendor = await this.authz.requireActiveVendor(offer.vendorId);
    this.authz.assertCanMutate(vendor, actorUserId, actorRoles);
    return offer;
  }
}
