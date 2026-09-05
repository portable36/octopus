import { describe, expect, it, vi } from 'vitest';
import { CreateVariantHandler, VariantLifecycleHandler } from './variant.handlers';
import { Product } from '../../domain/aggregates/product.aggregate';
import { Variant } from '../../domain/aggregates/variant.aggregate';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { BarcodeAlreadyExistsError, CatalogSkuTakenError } from '../errors/catalog.errors';
import { DuplicateVariantAttributesError } from '../../domain/errors/catalog.errors';

describe('VariantHandlers', () => {
  const vendorId = '00000000-0000-0000-0000-000000000001';
  const ownerId = '00000000-0000-0000-0000-000000000002';

  const createMockAuthz = () => ({
    requireActiveVendor: vi.fn().mockResolvedValue({
      vendorId,
      ownerUserId: ownerId,
      staffUserIds: [],
      status: 'active',
    }),
    assertCanMutate: vi.fn(),
  });

  const createProduct = () => {
    return Product.create({
      vendorId,
      sku: 'PRO-ABC-1234',
      name: 'Sample Product',
    });
  };

  describe('CreateVariantHandler', () => {
    it('creates variant with barcode, weight and dimensions', async () => {
      const product = createProduct();
      const products = {
        findById: vi.fn().mockResolvedValue(product),
        save: vi.fn().mockResolvedValue(undefined),
      };
      const variants = {
        existsByVendorAndSku: vi.fn().mockResolvedValue(false),
        existsByVendorAndBarcode: vi.fn().mockResolvedValue(false),
        findByProductId: vi.fn().mockResolvedValue([]),
        save: vi.fn().mockResolvedValue(undefined),
      };
      const authz = createMockAuthz();

      const handler = new CreateVariantHandler(
        products as never,
        variants as never,
        authz as never,
      );

      const variant = await handler.execute({
        productId: product.id.value,
        actorUserId: ownerId,
        actorRoles: ['VENDOR_OWNER'],
        name: 'Variant 1',
        sku: 'VAR-ABC-1234',
        barcode: 'BAR-123456789',
        weightGrams: 500,
        dimensions: {
          lengthMillimeters: 100,
          widthMillimeters: 50,
          heightMillimeters: 25,
        },
      });

      expect(variant.name).toBe('Variant 1');
      expect(variant.sku).toBe('VAR-ABC-1234');
      expect(variant.barcode).toBe('BAR-123456789');
      expect(variant.weight?.grams).toBe(500);
      expect(variant.dimensions?.lengthMillimeters).toBe(100);
      expect(variants.save).toHaveBeenCalledWith(variant);
      expect(products.save).toHaveBeenCalledWith(product);
    });

    it('rejects when barcode already exists for the vendor', async () => {
      const product = createProduct();
      const products = {
        findById: vi.fn().mockResolvedValue(product),
        save: vi.fn(),
      };
      const variants = {
        existsByVendorAndSku: vi.fn().mockResolvedValue(false),
        existsByVendorAndBarcode: vi.fn().mockResolvedValue(true),
        findByProductId: vi.fn().mockResolvedValue([]),
        save: vi.fn(),
      };
      const authz = createMockAuthz();

      const handler = new CreateVariantHandler(
        products as never,
        variants as never,
        authz as never,
      );

      await expect(
        handler.execute({
          productId: product.id.value,
          actorUserId: ownerId,
          actorRoles: ['VENDOR_OWNER'],
          name: 'Variant 1',
          sku: 'VAR-ABC-1234',
          barcode: 'BAR-DUPLICATE',
        }),
      ).rejects.toBeInstanceOf(BarcodeAlreadyExistsError);
    });

    it('rejects when SKU already exists for the vendor', async () => {
      const product = createProduct();
      const products = {
        findById: vi.fn().mockResolvedValue(product),
        save: vi.fn(),
      };
      const variants = {
        existsByVendorAndSku: vi.fn().mockResolvedValue(true),
        existsByVendorAndBarcode: vi.fn().mockResolvedValue(false),
        findByProductId: vi.fn().mockResolvedValue([]),
        save: vi.fn(),
      };
      const authz = createMockAuthz();

      const handler = new CreateVariantHandler(
        products as never,
        variants as never,
        authz as never,
      );

      await expect(
        handler.execute({
          productId: product.id.value,
          actorUserId: ownerId,
          actorRoles: ['VENDOR_OWNER'],
          name: 'Variant 1',
          sku: 'VAR-ABC-1234',
        }),
      ).rejects.toBeInstanceOf(CatalogSkuTakenError);
    });

    it('rejects duplicate attribute combinations among sibling variants', async () => {
      const product = createProduct();
      const existingVariant = Variant.create(UniqueID.from(product.id.value), {
        sku: 'VAR-ABC-1111',
        name: 'Red Large',
        attributes: [
          { code: 'color', value: 'red' },
          { code: 'size', value: 'L' },
        ],
      });

      const products = {
        findById: vi.fn().mockResolvedValue(product),
        save: vi.fn(),
      };
      const variants = {
        existsByVendorAndSku: vi.fn().mockResolvedValue(false),
        existsByVendorAndBarcode: vi.fn().mockResolvedValue(false),
        findByProductId: vi.fn().mockResolvedValue([existingVariant]),
        save: vi.fn(),
      };
      const authz = createMockAuthz();

      const handler = new CreateVariantHandler(
        products as never,
        variants as never,
        authz as never,
      );

      await expect(
        handler.execute({
          productId: product.id.value,
          actorUserId: ownerId,
          actorRoles: ['VENDOR_OWNER'],
          name: 'Duplicate Red Large',
          sku: 'VAR-ABC-2222',
          attributes: [
            { code: 'size', value: 'L' },
            { code: 'color', value: 'red' },
          ],
        }),
      ).rejects.toBeInstanceOf(DuplicateVariantAttributesError);
    });
  });

  describe('VariantLifecycleHandler', () => {
    it('activates a draft variant', async () => {
      const product = createProduct();
      const variant = Variant.create(UniqueID.from(product.id.value), {
        sku: 'VAR-ABC-1234',
        name: 'Variant',
      });
      const products = { findById: vi.fn().mockResolvedValue(product) };
      const variants = {
        findById: vi.fn().mockResolvedValue(variant),
        save: vi.fn().mockResolvedValue(undefined),
      };
      const authz = createMockAuthz();

      const handler = new VariantLifecycleHandler(
        products as never,
        variants as never,
        authz as never,
      );
      const activated = await handler.activate(variant.id.value, ownerId, ['VENDOR_OWNER']);

      expect(activated.status).toBe('ACTIVE');
      expect(variants.save).toHaveBeenCalledWith(variant);
    });

    it('archives an active variant', async () => {
      const product = createProduct();
      const variant = Variant.create(UniqueID.from(product.id.value), {
        sku: 'VAR-ABC-1234',
        name: 'Variant',
      });
      variant.activate();

      const products = { findById: vi.fn().mockResolvedValue(product) };
      const variants = {
        findById: vi.fn().mockResolvedValue(variant),
        save: vi.fn().mockResolvedValue(undefined),
      };
      const authz = createMockAuthz();

      const handler = new VariantLifecycleHandler(
        products as never,
        variants as never,
        authz as never,
      );
      const archived = await handler.archive(variant.id.value, ownerId, ['VENDOR_OWNER']);

      expect(archived.status).toBe('ARCHIVED');
      expect(variants.save).toHaveBeenCalledWith(variant);
    });
  });
});
