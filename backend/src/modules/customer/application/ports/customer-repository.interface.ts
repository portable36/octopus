import type {
  CustomerAddressRecord,
  CustomerProfileRecord,
  ProductReviewRecord,
  ProductReviewSummary,
  WishlistItemRecord,
} from '../../domain/customer.types';

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');

export interface CustomerRepository {
  getProfile(userId: string): Promise<CustomerProfileRecord | null>;
  upsertProfile(
    userId: string,
    patch: { readonly displayName?: string; readonly phone?: string | null },
  ): Promise<CustomerProfileRecord>;
  listAddresses(userId: string): Promise<readonly CustomerAddressRecord[]>;
  findAddress(userId: string, addressId: string): Promise<CustomerAddressRecord | null>;
  saveAddress(address: CustomerAddressRecord): Promise<CustomerAddressRecord>;
  deleteAddress(userId: string, addressId: string): Promise<boolean>;
  clearDefaultFlags(userId: string): Promise<void>;

  listWishlist(userId: string): Promise<readonly WishlistItemRecord[]>;
  findWishlistItem(userId: string, productId: string): Promise<WishlistItemRecord | null>;
  addWishlistItem(item: WishlistItemRecord): Promise<WishlistItemRecord>;
  removeWishlistItem(userId: string, productId: string): Promise<boolean>;

  listPublishedReviews(productId: string): Promise<readonly ProductReviewRecord[]>;
  getReviewSummary(productId: string): Promise<ProductReviewSummary>;
  findReviewByUser(userId: string, productId: string): Promise<ProductReviewRecord | null>;
  saveReview(review: ProductReviewRecord): Promise<ProductReviewRecord>;
  deleteReview(userId: string, reviewId: string): Promise<boolean>;
}
