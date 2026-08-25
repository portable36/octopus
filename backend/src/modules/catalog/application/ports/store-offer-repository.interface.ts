import type { StoreOffer } from '../../domain/aggregates/store-offer.aggregate';

export const STORE_OFFER_REPOSITORY = Symbol('STORE_OFFER_REPOSITORY');

export interface StoreOfferRepository {
  save(offer: StoreOffer): Promise<void>;
  findById(id: string): Promise<StoreOffer | null>;
  findByStoreId(storeId: string): Promise<StoreOffer[]>;
  findByStoreAndVariant(storeId: string, variantId: string): Promise<StoreOffer | null>;
  existsByStoreAndVariant(storeId: string, variantId: string): Promise<boolean>;
  findActiveByProductId(productId: string): Promise<StoreOffer[]>;
}
