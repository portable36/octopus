import { describe, expect, it, vi } from 'vitest';
import { MeilisearchProductSearchAdapter } from './meilisearch-product-search.adapter';
import type { OfferSearchDocument } from '../../domain/search.types';

describe('MeilisearchProductSearchAdapter upsertIfNewer', () => {
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
    brandId: null,
    categoryIds: [],
    priceMinor: 100,
    currencyCode: 'BDT',
    stockStatus: 'IN_STOCK',
    offerStatus: 'active',
    productStatus: 'published',
    searchable: true,
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
});
