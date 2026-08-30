import { describe, expect, it } from 'vitest';
import { buildSearchFilterUrl } from './search-filters-form';

describe('buildSearchFilterUrl', () => {
  it('preserves scope while replacing filters and resetting pagination', () => {
    const current = new URLSearchParams(
      'categoryId=category-1&storeId=store-1&page=4&stockStatus=OUT_OF_STOCK',
    );

    expect(
      buildSearchFilterUrl('/categories/electronics', current, {
        q: '  headphones ',
        sort: 'price_asc',
        minPrice: '1000',
        maxPrice: '5000',
        stockStatus: 'IN_STOCK',
      }),
    ).toBe(
      '/categories/electronics?categoryId=category-1&storeId=store-1&q=headphones&sort=price_asc&minPriceMinor=1000&maxPriceMinor=5000&stockStatus=IN_STOCK',
    );
  });

  it('returns the clean action path when no filters remain', () => {
    expect(
      buildSearchFilterUrl('/search', new URLSearchParams('page=2'), {
        q: '',
        sort: 'relevance',
        minPrice: '',
        maxPrice: '',
        stockStatus: '',
      }),
    ).toBe('/search');
  });
});
