import { describe, expect, it, vi } from 'vitest';
import { MeilisearchProductSearchAdapter } from './meilisearch-product-search.adapter';
import type { OfferSearchDocument } from '../../domain/search.types';

describe('MeilisearchProductSearchAdapter', () => {
  const baseDoc: OfferSearchDocument = {
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
    semanticText: 'Tee',
    brandId: null,
    categoryIds: [],
    priceMinor: 100,
    currencyCode: 'BDT',
    stockStatus: 'IN_STOCK',
    offerStatus: 'active',
    productStatus: 'published',
    searchable: true,
    primaryImageMediaId: null,
    updatedAtUnix: 1000,
    version: 2,
  };

  it('skips when indexed version is newer', async () => {
    const addDocuments = vi.fn();
    const getDocument = vi.fn().mockResolvedValue({ ...baseDoc, version: 5 });
    const adapter = Object.create(
      MeilisearchProductSearchAdapter.prototype,
    ) as MeilisearchProductSearchAdapter;
    Object.assign(adapter, {
      index: () => ({ getDocument, addDocuments }),
      upsert: (doc: OfferSearchDocument) => addDocuments([doc]),
    });

    const result = await adapter.upsertIfNewer({ ...baseDoc, version: 2 });
    expect(result).toBe('skipped');
    expect(addDocuments).not.toHaveBeenCalled();
  });

  it('writes when document is missing', async () => {
    const addDocuments = vi.fn().mockResolvedValue(undefined);
    const getDocument = vi.fn().mockRejectedValue(new Error('not found'));
    const adapter = Object.create(
      MeilisearchProductSearchAdapter.prototype,
    ) as MeilisearchProductSearchAdapter;
    Object.assign(adapter, {
      index: () => ({ getDocument, addDocuments }),
      upsert: async (doc: OfferSearchDocument) => {
        await addDocuments([doc]);
      },
    });

    const result = await adapter.upsertIfNewer(baseDoc);
    expect(result).toBe('written');
    expect(addDocuments).toHaveBeenCalled();
  });

  it('maps Meili facetDistribution into app facet buckets', async () => {
    const search = vi.fn().mockResolvedValue({
      hits: [],
      estimatedTotalHits: 0,
      processingTimeMs: 3,
      facetDistribution: {
        categoryIds: { c1: 2, c2: 5 },
        vendorId: { v1: 7 },
        storeId: { s1: 7 },
        stockStatus: { IN_STOCK: 7 },
      },
    });
    const adapter = Object.create(
      MeilisearchProductSearchAdapter.prototype,
    ) as MeilisearchProductSearchAdapter;
    Object.assign(adapter, { index: () => ({ search }) });

    const result = await adapter.search({ q: 'tee' });
    expect(result.facets.categoryIds).toEqual([
      { value: 'c2', count: 5 },
      { value: 'c1', count: 2 },
    ]);
    expect(result.facets.vendorId).toEqual([{ value: 'v1', count: 7 }]);
    expect(search).toHaveBeenCalledWith(
      'tee',
      expect.objectContaining({
        facets: ['categoryIds', 'vendorId', 'storeId', 'stockStatus'],
      }),
    );
  });
});
