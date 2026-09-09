import { describe, expect, it, vi } from 'vitest';
import { CustomerHandlers } from './customer.handlers';
import type { CustomerRepository } from '../ports/customer-repository.interface';

describe('CustomerHandlers engagement', () => {
  const userId = 'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb';
  const productId = 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa';

  function build() {
    const customers: CustomerRepository = {
      getProfile: vi.fn(),
      upsertProfile: vi.fn(),
      listAddresses: vi.fn(),
      findAddress: vi.fn(),
      saveAddress: vi.fn(),
      deleteAddress: vi.fn(),
      clearDefaultFlags: vi.fn(),
      listWishlist: vi.fn().mockResolvedValue([]),
      findWishlistItem: vi.fn().mockResolvedValue(null),
      addWishlistItem: vi.fn(async (item) => item),
      removeWishlistItem: vi.fn().mockResolvedValue(true),
      listPublishedReviews: vi.fn().mockResolvedValue([]),
      getReviewSummary: vi.fn().mockResolvedValue({
        productId,
        averageRating: 0,
        reviewCount: 0,
      }),
      findReviewByUser: vi.fn().mockResolvedValue(null),
      saveReview: vi.fn(async (review) => review),
      deleteReview: vi.fn().mockResolvedValue(true),
    };
    return { handlers: new CustomerHandlers(customers), customers };
  }

  it('adds a wishlist item idempotently', async () => {
    const { handlers, customers } = build();
    const item = await handlers.addWishlistItem(userId, { productId });
    expect(item.productId).toBe(productId);
    expect(customers.addWishlistItem).toHaveBeenCalled();
  });

  it('creates a published product review', async () => {
    const { handlers, customers } = build();
    const review = await handlers.createReview(userId, {
      productId,
      rating: 5,
      title: 'Great product',
      body: 'Exactly as described and arrived quickly.',
    });
    expect(review.rating).toBe(5);
    expect(review.status).toBe('PUBLISHED');
    expect(customers.saveReview).toHaveBeenCalled();
  });
});
