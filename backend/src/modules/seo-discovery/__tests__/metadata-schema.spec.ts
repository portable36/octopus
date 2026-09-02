import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { SEO_OVERRIDE_REPOSITORY } from '../application/ports/seo-override-repository.interface';
import { SeoMetadataService } from '../application/services/seo-metadata.service';
import { StructuredDataEngine } from '../structured-data/structured-data.engine';

describe('on-page metadata and structured data', () => {
  describe('SeoMetadataService', () => {
    const overrides = {
      findByEntity: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns administrator override fields instead of defaults when an override exists', async () => {
      overrides.findByEntity.mockResolvedValue({
        title: 'Admin curated title',
        description: 'Admin curated description',
        noindex: true,
        canonicalUrl: 'https://shop.example.com/admin-canonical',
      });

      const moduleRef = await Test.createTestingModule({
        providers: [
          SeoMetadataService,
          { provide: SEO_OVERRIDE_REPOSITORY, useValue: overrides },
        ],
      }).compile();

      const service = moduleRef.get(SeoMetadataService);
      const metadata = await service.resolve({
        entityType: 'product',
        entityId: '11111111-1111-4111-8111-111111111111',
        defaults: {
          title: 'Default product title',
          description: 'Default product description',
          canonicalUrl: 'https://shop.example.com/products/default',
          noindex: false,
        },
      });

      expect(overrides.findByEntity).toHaveBeenCalledWith(
        'product',
        '11111111-1111-4111-8111-111111111111',
      );
      expect(metadata.title).toBe('Admin curated title');
      expect(metadata.description).toBe('Admin curated description');
      expect(metadata.canonicalUrl).toBe('https://shop.example.com/admin-canonical');
      expect(metadata.robotsDirectives).toEqual(['noindex', 'follow']);
      expect(metadata.openGraph.title).toBe('Admin curated title');
    });

    it('falls back to defaults when no override row exists', async () => {
      overrides.findByEntity.mockResolvedValue(null);

      const moduleRef = await Test.createTestingModule({
        providers: [
          SeoMetadataService,
          { provide: SEO_OVERRIDE_REPOSITORY, useValue: overrides },
        ],
      }).compile();

      const service = moduleRef.get(SeoMetadataService);
      const metadata = await service.resolve({
        entityType: 'category',
        entityId: '22222222-2222-4222-8222-222222222222',
        defaults: {
          title: 'Electronics',
          description: 'Browse electronics',
          canonicalUrl: 'https://shop.example.com/categories/electronics',
        },
      });

      expect(metadata.title).toBe('Electronics');
      expect(metadata.description).toBe('Browse electronics');
      expect(metadata.robotsDirectives).toEqual(['index', 'follow']);
    });
  });

  describe('StructuredDataEngine', () => {
    let engine: StructuredDataEngine;

    beforeEach(() => {
      engine = new StructuredDataEngine();
    });

    it('builds nested Offer structures with valid price and currency', () => {
      const product = engine.buildProduct({
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse',
        sku: 'MOUSE-001',
        url: 'https://shop.example.com/products/mouse-001',
        offers: [
          {
            priceMinor: 2499,
            currencyCode: 'BDT',
            availability: 'in_stock',
            url: 'https://shop.example.com/products/mouse-001',
            sku: 'MOUSE-001',
          },
        ],
      });

      expect(product['@type']).toBe('Product');
      expect(product.offers).toMatchObject({
        '@type': 'Offer',
        price: '24.99',
        priceCurrency: 'BDT',
        availability: 'https://schema.org/InStock',
        url: 'https://shop.example.com/products/mouse-001',
        sku: 'MOUSE-001',
      });
    });

    it('emits an Offer array when multiple store offers exist', () => {
      const product = engine.buildProduct({
        name: 'USB-C Hub',
        url: 'https://shop.example.com/products/hub',
        offers: [
          {
            priceMinor: 150000,
            currencyCode: 'BDT',
            availability: 'in_stock',
            url: 'https://shop.example.com/products/hub?store=a',
          },
          {
            priceMinor: 145000,
            currencyCode: 'BDT',
            availability: 'limited',
            url: 'https://shop.example.com/products/hub?store=b',
          },
        ],
      });

      expect(Array.isArray(product.offers)).toBe(true);
      const offers = product.offers as Array<Record<string, unknown>>;
      expect(offers).toHaveLength(2);
      expect(offers[0]).toMatchObject({ price: '1500.00', priceCurrency: 'BDT' });
      expect(offers[1]).toMatchObject({
        price: '1450.00',
        availability: 'https://schema.org/LimitedAvailability',
      });
    });

    it('builds BreadcrumbList and Organization schemas', () => {
      const breadcrumbs = engine.buildBreadcrumbList([
        { name: 'Home', url: 'https://shop.example.com/' },
        { name: 'Electronics', url: 'https://shop.example.com/categories/electronics' },
      ]);
      const organization = engine.buildOrganization({
        name: 'Octopus Shop',
        url: 'https://shop.example.com',
        logoUrl: 'https://shop.example.com/logo.png',
      });

      expect(breadcrumbs['@type']).toBe('BreadcrumbList');
      expect(breadcrumbs.itemListElement).toHaveLength(2);
      expect(breadcrumbs.itemListElement[1]?.position).toBe(2);
      expect(organization['@type']).toBe('Organization');
      expect(organization.logo).toBe('https://shop.example.com/logo.png');
    });
  });
});
