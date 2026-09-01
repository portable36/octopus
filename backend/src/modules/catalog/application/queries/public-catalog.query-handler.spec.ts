import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PublicCatalogQueryHandler } from './public-catalog.query-handler';
import { Product } from '../../domain/aggregates/product.aggregate';

describe('PublicCatalogQueryHandler', () => {
  it('returns published product with resolved media urls', async () => {
    const product = Product.create({
      vendorId: 'v1',
      sku: 'abc-def-1234',
      name: 'Oversized Tee',
      description: 'Cotton',
    });
    product.setMedia([{ mediaId: 'media-1', mediaType: 'IMAGE', isPrimary: true, sortOrder: 0 }]);

    const products = {
      findPublishedById: vi.fn().mockResolvedValue(product),
      listPublishedSitemapEntries: vi.fn(),
    };
    const variants = {
      findByProductId: vi.fn().mockResolvedValue([
        {
          id: { value: 'var-1' },
          sku: 'TEE-1',
          name: 'M',
          status: 'ACTIVE',
          attributes: [],
          media: [],
        },
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
    const mediaAccess = {
      findById: vi.fn(),
      resolvePublicImageUrl: vi.fn().mockResolvedValue({
        id: 'media-1',
        contentType: 'image/png',
        url: 'https://cdn.example/media-1.png',
      }),
    };
    const handler = new PublicCatalogQueryHandler(
      { listActive: vi.fn(), findActiveBySlug: vi.fn() } as never,
      products as never,
      variants as never,
      offers as never,
      { findActiveBySlug: vi.fn() } as never,
      {
        findById: vi.fn(),
        findActivePublicById: vi.fn(),
        findActivePublicBySlug: vi.fn(),
      } as never,
      mediaAccess as never,
    );

    const result = await handler.getPublishedProduct('prod-1');
    expect(result.slug).toBe('oversized-tee');
    expect(result.media[0]?.url).toBe('https://cdn.example/media-1.png');
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
      {
        findById: vi.fn(),
        findActivePublicById: vi.fn(),
        findActivePublicBySlug: vi.fn(),
      } as never,
      { findById: vi.fn(), resolvePublicImageUrl: vi.fn() } as never,
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
      {
        findById: vi.fn(),
        findActivePublicById: vi.fn(),
        findActivePublicBySlug: vi.fn(),
      } as never,
      { findById: vi.fn(), resolvePublicImageUrl: vi.fn() } as never,
    );
    await expect(handler.listSitemapProducts()).resolves.toEqual([
      { id: 'prod-1', updatedAt: updatedAt.toISOString() },
    ]);
  });

  it('returns active vendor shop with storefront stores', async () => {
    const handler = new PublicCatalogQueryHandler(
      { listActive: vi.fn(), findActiveBySlug: vi.fn() } as never,
      { findPublishedById: vi.fn() } as never,
      { findByProductId: vi.fn() } as never,
      { findActiveByProductId: vi.fn() } as never,
      {
        findActiveBySlug: vi.fn(),
        listActiveByVendorId: vi.fn().mockResolvedValue([
          {
            storeId: 'store-1',
            vendorId: 'vendor-1',
            status: 'active',
            displayName: 'Gulshan Branch',
            slug: 'gulshan',
            description: null,
            locale: 'en',
            currencyCode: 'BDT',
            acceptsOnlineOrders: true,
            addressLine1: null,
            city: null,
            region: null,
            managerUserIds: [],
            staffUserIds: [],
            codEnabled: true,
            codMinAmountMinor: 0,
            codMaxAmountMinor: null,
            codReservationTtlHours: 24,
          },
        ]),
      } as never,
      {
        findById: vi.fn(),
        findActivePublicById: vi.fn(),
        findActivePublicBySlug: vi.fn().mockResolvedValue({
          vendorId: 'vendor-1',
          slug: 'dhaka-fresh',
          displayName: 'Dhaka Fresh',
          description: 'Farm to table',
        }),
      } as never,
      { findById: vi.fn(), resolvePublicImageUrl: vi.fn() } as never,
    );

    await expect(handler.getActiveVendorShopBySlug('dhaka-fresh')).resolves.toEqual({
      id: 'vendor-1',
      slug: 'dhaka-fresh',
      displayName: 'Dhaka Fresh',
      description: 'Farm to table',
      stores: [
        {
          id: 'store-1',
          slug: 'gulshan',
          displayName: 'Gulshan Branch',
          description: null,
          currencyCode: 'BDT',
          acceptsOnlineOrders: true,
        },
      ],
    });
  });

  it('404s when vendor shop is not active', async () => {
    const handler = new PublicCatalogQueryHandler(
      { listActive: vi.fn(), findActiveBySlug: vi.fn() } as never,
      { findPublishedById: vi.fn() } as never,
      { findByProductId: vi.fn() } as never,
      { findActiveByProductId: vi.fn() } as never,
      { findActiveBySlug: vi.fn(), listActiveByVendorId: vi.fn() } as never,
      { findById: vi.fn(), findActivePublicBySlug: vi.fn().mockResolvedValue(null) } as never,
      { findById: vi.fn(), resolvePublicImageUrl: vi.fn() } as never,
    );
    await expect(handler.getActiveVendorShopBySlug('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
