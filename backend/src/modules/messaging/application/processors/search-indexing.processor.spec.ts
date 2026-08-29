import { describe, expect, it, vi } from 'vitest';
import { SearchIndexingProcessor } from './search-indexing.processor';

function offerSource(id: string) {
  return {
    offerId: id,
    productId: 'p1',
    variantId: 'v1',
    vendorId: 'ven1',
    storeId: 's1',
    name: 'Tee',
    slug: 'tee',
    sku: 'TEE',
    priceMinor: 100,
    currencyCode: 'BDT',
    offerStatus: 'active',
    offerAvailable: true,
    productStatus: 'published',
    updatedAt: new Date('2026-08-25T00:00:00.000Z'),
    version: 1,
  };
}

describe('SearchIndexingProcessor', () => {
  it('indexes store offer with inventory availability', async () => {
    const index = {
      indexOfferSource: vi.fn(async () => 'written' as const),
      deleteByOfferId: vi.fn(),
    };
    const catalog = {
      loadOfferSources: vi.fn(async () => [offerSource('o1')]),
      listOfferIdsByProductId: vi.fn(),
      listOfferIdsByVariantId: vi.fn(),
      listOfferIdsByStoreAndVariant: vi.fn(),
    };
    const inventory = {
      checkStoreAvailability: vi.fn(async () => ({
        storeId: 's1',
        variantId: 'v1',
        available: 4,
        status: 'ACTIVE' as const,
      })),
    };
    const redis = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => 'OK'),
      del: vi.fn(async () => 1),
    };
    const processor = new SearchIndexingProcessor(
      redis as never,
      index as never,
      catalog as never,
      inventory as never,
    );

    await processor.handle({
      outboxId: 'out-1',
      source: 'catalog',
      aggregateId: 'o1',
      eventType: 'StoreOfferActivated',
      payload: { offerId: 'o1' },
      eventVersion: 1,
    });

    expect(catalog.loadOfferSources).toHaveBeenCalledWith(['o1']);
    expect(index.indexOfferSource).toHaveBeenCalledWith(
      expect.objectContaining({ offerId: 'o1' }),
      4,
    );
  });

  it('does not permanently deduplicate a failed indexing attempt', async () => {
    const index = {
      indexOfferSource: vi
        .fn()
        .mockRejectedValueOnce(new Error('temporary search outage'))
        .mockResolvedValue('written' as const),
      deleteByOfferId: vi.fn(),
    };
    const catalog = {
      loadOfferSources: vi.fn(async () => [offerSource('o1')]),
      listOfferIdsByProductId: vi.fn(),
      listOfferIdsByVariantId: vi.fn(),
      listOfferIdsByStoreAndVariant: vi.fn(),
    };
    const redis = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => 'OK'),
      del: vi.fn(async () => 1),
    };
    const processor = new SearchIndexingProcessor(
      redis as never,
      index as never,
      catalog as never,
      {
        checkStoreAvailability: vi.fn(async () => ({
          storeId: 's1',
          variantId: 'v1',
          available: 4,
          status: 'ACTIVE' as const,
        })),
      } as never,
    );
    const job = {
      outboxId: 'out-retry',
      source: 'catalog' as const,
      aggregateId: 'o1',
      eventType: 'StoreOfferActivated',
      payload: { offerId: 'o1' },
      eventVersion: 1,
    };

    await expect(processor.handle(job)).rejects.toThrow('temporary search outage');
    await expect(processor.handle(job)).resolves.toBeUndefined();

    expect(index.indexOfferSource).toHaveBeenCalledTimes(2);
  });

  it('skips duplicate deliveries', async () => {
    const index = { indexOfferSource: vi.fn(), deleteByOfferId: vi.fn() };
    const processor = new SearchIndexingProcessor(
      {
        get: vi.fn(async () => '1'),
        set: vi.fn(async () => null),
        del: vi.fn(),
      } as never,
      index as never,
      {} as never,
      {} as never,
    );
    await processor.handle({
      outboxId: 'out-1',
      source: 'catalog',
      aggregateId: 'o1',
      eventType: 'StoreOfferActivated',
      payload: { offerId: 'o1' },
      eventVersion: 1,
    });
    expect(index.indexOfferSource).not.toHaveBeenCalled();
  });

  it('reindexes offers for inventory adjustments by store+variant', async () => {
    const index = {
      indexOfferSource: vi.fn(async () => 'written' as const),
      deleteByOfferId: vi.fn(),
    };
    const catalog = {
      loadOfferSources: vi.fn(async (ids: readonly string[]) => ids.map((id) => offerSource(id))),
      listOfferIdsByStoreAndVariant: vi.fn(async () => ['o1']),
      listOfferIdsByVariantId: vi.fn(),
      listOfferIdsByProductId: vi.fn(),
    };
    const processor = new SearchIndexingProcessor(
      {
        get: vi.fn(async () => null),
        set: vi.fn(async () => 'OK'),
        del: vi.fn(async () => 1),
      } as never,
      index as never,
      catalog as never,
      {
        checkStoreAvailability: vi.fn(async () => ({
          storeId: 's1',
          variantId: 'v1',
          available: 0,
          status: 'ACTIVE' as const,
        })),
      } as never,
    );

    await processor.handle({
      outboxId: 'out-2',
      source: 'inventory',
      aggregateId: 'inv-1',
      eventType: 'InventoryAdjusted',
      payload: { variantId: 'v1', storeId: 's1' },
      eventVersion: 1,
    });

    expect(catalog.listOfferIdsByStoreAndVariant).toHaveBeenCalledWith('s1', 'v1');
    expect(catalog.loadOfferSources).toHaveBeenCalledWith(['o1']);
    expect(index.indexOfferSource).toHaveBeenCalledTimes(1);
  });

  it('indexes offer ids from SearchReindexBatch payload', async () => {
    const index = {
      indexOfferSource: vi.fn(async () => 'written' as const),
      deleteByOfferId: vi.fn(),
    };
    const catalog = {
      loadOfferSources: vi.fn(async (ids: readonly string[]) => ids.map((id) => offerSource(id))),
      listOfferIdsByProductId: vi.fn(),
      listOfferIdsByVariantId: vi.fn(),
      listOfferIdsByStoreAndVariant: vi.fn(),
    };
    const processor = new SearchIndexingProcessor(
      {
        get: vi.fn(async () => null),
        set: vi.fn(async () => 'OK'),
        del: vi.fn(async () => 1),
      } as never,
      index as never,
      catalog as never,
      {
        checkStoreAvailability: vi.fn(async () => ({
          storeId: 's1',
          variantId: 'v1',
          available: 1,
          status: 'ACTIVE' as const,
        })),
      } as never,
    );

    await processor.handle({
      outboxId: 'reindex-1',
      source: 'catalog',
      aggregateId: 'o1',
      eventType: 'SearchReindexBatch',
      payload: { offerIds: ['o1', 'o2'] },
      eventVersion: 1,
    });

    expect(catalog.loadOfferSources).toHaveBeenCalledWith(['o1', 'o2']);
    expect(index.indexOfferSource).toHaveBeenCalledTimes(2);
  });
});
