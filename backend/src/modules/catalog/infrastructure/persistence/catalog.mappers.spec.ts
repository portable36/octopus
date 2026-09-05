import { describe, expect, it } from 'vitest';
import {
  applyCategoryToOrm,
  applyProductToOrm,
  applyVariantToOrm,
  categoryToDomain,
  productToDomain,
  variantToDomain,
} from './catalog.mappers';
import { Product } from '../../domain/aggregates/product.aggregate';
import { Variant } from '../../domain/aggregates/variant.aggregate';
import { Category } from '../../domain/aggregates/category.aggregate';
import { ProductOrmEntity } from './product.orm-entity';
import { VariantOrmEntity } from './variant.orm-entity';
import { CategoryOrmEntity } from './category.orm-entity';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { Weight } from '../../domain/value-objects/weight.value-object';
import { Dimensions } from '../../domain/value-objects/dimensions.value-object';

describe('CatalogMappers', () => {
  const vendorId = '00000000-0000-0000-0000-000000000001';

  it('maps variant with barcode, weight and dimensions round-trip', () => {
    const productId = UniqueID.create().value;
    const variant = Variant.create(UniqueID.from(productId), {
      sku: 'VAR-ABC-1234',
      name: 'Test Variant',
      barcode: '8901234567890',
      weight: Weight.create(750),
      dimensions: Dimensions.create({
        lengthMillimeters: 150,
        widthMillimeters: 80,
        heightMillimeters: 20,
      }),
    });

    const entity = new VariantOrmEntity();
    applyVariantToOrm(variant, vendorId, entity);

    expect(entity.id).toBe(variant.id.value);
    expect(entity.vendorId).toBe(vendorId);
    expect(entity.barcode).toBe('8901234567890');
    expect(entity.weightGrams).toBe(750);
    expect(entity.lengthMm).toBe(150);
    expect(entity.widthMm).toBe(80);
    expect(entity.heightMm).toBe(20);

    const reconstituted = variantToDomain(entity);
    expect(reconstituted.id.value).toBe(variant.id.value);
    expect(reconstituted.barcode).toBe('8901234567890');
    expect(reconstituted.weight?.grams).toBe(750);
    expect(reconstituted.dimensions?.lengthMillimeters).toBe(150);
    expect(reconstituted.dimensions?.widthMillimeters).toBe(80);
    expect(reconstituted.dimensions?.heightMillimeters).toBe(20);
  });

  it('maps product round-trip', () => {
    const product = Product.create({
      vendorId,
      sku: 'PRO-ABC-1234',
      name: 'Product Name',
      description: 'Product Description',
    });

    const entity = new ProductOrmEntity();
    applyProductToOrm(product, entity);

    expect(entity.id).toBe(product.id.value);
    expect(entity.name).toBe('Product Name');
    expect(entity.vendorId).toBe(vendorId);

    const reconstituted = productToDomain(entity);
    expect(reconstituted.id.value).toBe(product.id.value);
    expect(reconstituted.sku).toBe('PRO-ABC-1234');
    expect(reconstituted.name).toBe('Product Name');
  });

  it('maps category round-trip', () => {
    const category = Category.create({
      name: 'Apparel',
      sortOrder: 2,
      seoTitle: 'Fashion & Apparel',
      seoDescription: 'Clothing collection',
    });

    const entity = new CategoryOrmEntity();
    applyCategoryToOrm(category, entity);

    expect(entity.id).toBe(category.id.value);
    expect(entity.name).toBe('Apparel');
    expect(entity.slug).toBe('apparel');
    expect(entity.sortOrder).toBe(2);

    const reconstituted = categoryToDomain(entity);
    expect(reconstituted.id.value).toBe(category.id.value);
    expect(reconstituted.name).toBe('Apparel');
    expect(reconstituted.slug).toBe('apparel');
    expect(reconstituted.seo.title).toBe('Fashion & Apparel');
  });
});
