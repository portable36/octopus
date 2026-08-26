import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PublicCatalogQueryHandler } from './public-catalog.query-handler';

describe('PublicCatalogQueryHandler', () => {
  it('returns published product with active offers only', async () => {
    const products = {
      findPublishedById: vi.fn().mockResolvedValue({
        id: { value: 'prod-1' },
        vendorId: 'v1',
        name: 'Oversized Tee',
        description: 'Cotton',
        brandId: null,
        categoryIds: ['c1'],
        media: [],
      }),
    };
    const variants = {
      findByProductId: vi
        .fn()
        .mockResolvedValue([
          { id: { value: 'var-1' }, sku: 'TEE-1', name: 'M', status: 'ACTIVE', media: [] },
        ]),
    };
    const offers = {
      findActiveByProductId: vi.fn().mockResolvedValue([
        {
          id: { value: 'o1' },
          storeId: 's1',
          variantId: 'var-1',
          priceMinor: 1200,
          currencyCode: 'BDT',
          isAvailable: true,
        },
      ]),
    };
    const handler = new PublicCatalogQueryHandler(
      { listActive: vi.fn(), findActiveBySlug: vi.fn() } as never,
      products as never,
      variants as never,
      offers as never,
      { findActiveBySlug: vi.fn() } as never,
    );

    const result = await handler.getPublishedProduct('prod-1');
    expect(result.slug).toBe('oversized-tee');
    expect(result.offers).toHaveLength(1);
    expect(products.findPublishedById).toHaveBeenCalledWith('prod-1');
  });

  it('404s when product is not published', async () => {
    const handler = new PublicCatalogQueryHandler(
      { listActive: vi.fn(), findActiveBySlug: vi.fn() } as never,
      { findPublishedById: vi.fn().mockResolvedValue(null) } as never,
      { findByProductId: vi.fn() } as never,
      { findActiveByProductId: vi.fn() } as never,
      { findActiveBySlug: vi.fn() } as never,
    );
    await expect(handler.getPublishedProduct('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists published product ids for sitemap from catalog repository', async () => {
    const updatedAt = new Date('2025-01-02T00:00:00.000Z');
    const products = {
      findPublishedById: vi.fn(),
      listPublishedSitemapEntries: vi.fn().mockResolvedValue([{ id: 'prod-1', updatedAt }]),
    };
    const handler = new PublicCatalogQueryHandler(
      { listActive: vi.fn(), findActiveBySlug: vi.fn() } as never,
      products as never,
      { findByProductId: vi.fn() } as never,
      { findActiveByProductId: vi.fn() } as never,
      { findActiveBySlug: vi.fn() } as never,
    );
    await expect(handler.listSitemapProducts()).resolves.toEqual([
      { id: 'prod-1', updatedAt: updatedAt.toISOString() },
    ]);
  });
});
