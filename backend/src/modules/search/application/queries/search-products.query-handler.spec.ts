import { describe, expect, it, vi } from 'vitest';
import { SearchProductsQueryHandler } from './search-products.query-handler';

describe('SearchProductsQueryHandler', () => {
  it('resolves primaryImageUrl for search hits', async () => {
    const handler = new SearchProductsQueryHandler(
      {
        search: vi.fn().mockResolvedValue({
          hits: [
            {
              id: 'offer-1',
              offerId: 'offer-1',
              productId: 'p1',
              variantId: 'v1',
              vendorId: 'vendor-1',
              storeId: 'store-1',
              name: 'Tee',
              slug: 'tee',
              sku: 'SKU',
              shortDescription: '',
              brandId: null,
              categoryIds: [],
              priceMinor: 100,
              currencyCode: 'BDT',
              stockStatus: 'IN_STOCK',
              offerStatus: 'active',
              productStatus: 'published',
              searchable: true,
              primaryImageMediaId: 'media-1',
              updatedAtUnix: 1000,
              version: 1,
            },
            {
              id: 'offer-2',
              offerId: 'offer-2',
              productId: 'p2',
              variantId: 'v2',
              vendorId: 'vendor-1',
              storeId: 'store-1',
              name: 'Hat',
              slug: 'hat',
              sku: 'HAT',
              shortDescription: '',
              brandId: null,
              categoryIds: [],
              priceMinor: 200,
              currencyCode: 'BDT',
              stockStatus: 'IN_STOCK',
              offerStatus: 'active',
              productStatus: 'published',
              searchable: true,
              primaryImageMediaId: null,
              updatedAtUnix: 1000,
              version: 1,
            },
          ],
          query: '',
          page: 1,
          limit: 20,
          estimatedTotal: 2,
          processingTimeMs: 1,
          facets: {
            categoryIds: [],
            vendorId: [],
            storeId: [],
            stockStatus: [],
          },
        }),
      } as never,
      {
        resolvePublicImageUrl: vi.fn().mockResolvedValue({
          id: 'media-1',
          contentType: 'image/png',
          url: 'https://cdn.example/media-1.png',
        }),
        findById: vi.fn(),
      } as never,
    );

    const result = await handler.execute({ q: 'tee' });
    expect(result.hits[0]?.primaryImageUrl).toBe('https://cdn.example/media-1.png');
    expect(result.hits[1]?.primaryImageUrl).toBeNull();
  });
});
