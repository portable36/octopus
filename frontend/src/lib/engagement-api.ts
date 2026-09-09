import { apiRequest } from '@/lib/api-client';
import { authedRequest } from '@/lib/auth-api';

export type WishlistItem = {
  id: string;
  productId: string;
  variantId: string | null;
  storeId: string | null;
  createdAt: string;
};

export type ProductReview = {
  id: string;
  productId: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
};

export type ProductReviewSummary = {
  productId: string;
  averageRating: number;
  reviewCount: number;
};

export async function listWishlist(): Promise<WishlistItem[]> {
  return authedRequest<WishlistItem[]>('/customer/wishlist');
}

export async function addToWishlist(input: {
  productId: string;
  variantId?: string;
  storeId?: string;
}): Promise<WishlistItem> {
  return authedRequest<WishlistItem>('/customer/wishlist', {
    method: 'POST',
    body: input,
  });
}

export async function removeFromWishlist(productId: string): Promise<void> {
  await authedRequest<void>(`/customer/wishlist/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
  });
}

export async function fetchProductReviews(productId: string): Promise<{
  summary: ProductReviewSummary;
  reviews: ProductReview[];
}> {
  return apiRequest(`/products/${encodeURIComponent(productId)}/reviews`);
}

export async function submitProductReview(input: {
  productId: string;
  rating: number;
  title: string;
  body: string;
  orderId?: string;
}): Promise<ProductReview & { status: string; userId: string }> {
  return authedRequest('/customer/reviews', {
    method: 'POST',
    body: input,
  });
}
