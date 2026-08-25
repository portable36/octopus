import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { SearchReindexHandler } from './search-reindex.handler';

describe('SearchReindexHandler', () => {
  it('rejects non-platform actors', async () => {
    const handler = new SearchReindexHandler(
      { listOfferIdsPage: vi.fn() } as never,
      { enqueueOfferBatches: vi.fn() } as never,
    );
    await expect(handler.enqueueFullReindex(['VENDOR_OWNER'])).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('pages offers and enqueues batches', async () => {
    const listOfferIdsPage = vi
      .fn()
      .mockResolvedValueOnce({
        offerIds: Array.from({ length: 50 }, (_, i) => `o${i}`),
        nextAfterId: 'o49',
      })
      .mockResolvedValueOnce({ offerIds: ['o50'], nextAfterId: null });
    const enqueueOfferBatches = vi.fn().mockResolvedValue({ batches: 2, offerIds: 51 });
    const handler = new SearchReindexHandler(
      { listOfferIdsPage } as never,
      { enqueueOfferBatches } as never,
    );

    const result = await handler.enqueueFullReindex(['PLATFORM_ADMIN']);
    expect(result).toEqual({ batches: 2, offerIds: 51 });
    expect(enqueueOfferBatches).toHaveBeenCalledWith([
      Array.from({ length: 50 }, (_, i) => `o${i}`),
      ['o50'],
    ]);
  });
});
