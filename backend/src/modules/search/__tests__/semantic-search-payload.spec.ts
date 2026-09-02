import { describe, expect, it } from 'vitest';
import { buildOfferSearchDocument } from '../domain/services/build-offer-search-document';
import { buildSemanticSearchText } from '../domain/services/build-semantic-search-text';
import { compileSearchAttributes } from '../domain/services/compile-search-attributes';
import { stripHtmlForSearch } from '../domain/services/strip-html-for-search';

const baseSource = {
  offerId: '11111111-1111-7111-8111-111111111111',
  productId: '22222222-2222-7222-8222-222222222222',
  variantId: '33333333-3333-7333-8333-333333333333',
  vendorId: '44444444-4444-7444-8444-444444444444',
  storeId: '55555555-5555-7555-8555-555555555555',
  name: 'Organic Cotton Tee',
  variantName: 'Large / Navy',
  slug: 'organic-cotton-tee',
  sku: 'TEE-NAVY-L',
  shortDescription: '<p>Soft <strong>cotton</strong></p><script>alert(1)</script>',
  brandId: null,
  categoryIds: ['66666666-6666-7666-8666-666666666666'],
  categoryNames: ['Apparel', 'T-Shirts'],
  productAttributes: [
    { code: 'material', value: 'cotton' },
    { code: 'fit', value: ['regular', 'relaxed'] },
  ],
  variantAttributes: [{ code: 'size', value: 'L' }],
  reviewTexts: ['<p>Great fit</p>', 'Runs true to size'],
  priceMinor: 120000,
  currencyCode: 'BDT',
  offerStatus: 'active',
  offerAvailable: true,
  productStatus: 'published',
  stockAvailable: 4,
  primaryImageMediaId: null,
  updatedAt: new Date('2026-08-25T00:00:00.000Z'),
  version: 3,
};

describe('stripHtmlForSearch', () => {
  it('removes script tags and HTML without mutating unrelated strings', () => {
    const input = '<p>Hello</p><script>evil()</script><style>.x{}</style> world';
    expect(stripHtmlForSearch(input)).toBe('Hello world');
    expect(input).toContain('<script>');
  });
});

describe('compileSearchAttributes', () => {
  it('compiles nested attribute arrays without throwing', () => {
    const tokens = compileSearchAttributes([
      { code: 'color', value: ['navy', 'blue'] },
      { code: 'waterproof', value: true },
      { code: 'weight_g', value: 220 },
    ]);
    expect(tokens).toEqual(['color: navy', 'color: blue', 'waterproof: yes', 'weight_g: 220']);
  });
});

describe('buildSemanticSearchText', () => {
  it('aggregates name, categories, attributes, description, and reviews', () => {
    const text = buildSemanticSearchText({
      name: baseSource.name,
      variantName: baseSource.variantName,
      categoryNames: baseSource.categoryNames,
      shortDescription: baseSource.shortDescription,
      productAttributes: baseSource.productAttributes,
      variantAttributes: baseSource.variantAttributes,
      reviewTexts: baseSource.reviewTexts,
    });
    expect(text).toContain('Organic Cotton Tee');
    expect(text).toContain('Categories: Apparel, T-Shirts');
    expect(text).toContain('material: cotton');
    expect(text).toContain('fit: regular');
    expect(text).toContain('fit: relaxed');
    expect(text).toContain('size: L');
    expect(text).toContain('Soft cotton');
    expect(text).toContain('Great fit');
    expect(text).not.toContain('<script>');
    expect(text).not.toContain('alert');
  });
});

describe('buildOfferSearchDocument semantic sync', () => {
  it('strips HTML from shortDescription and builds semanticText for Meilisearch', () => {
    const doc = buildOfferSearchDocument(baseSource);
    expect(doc.shortDescription).toBe('Soft cotton');
    expect(doc.semanticText).toContain('Organic Cotton Tee');
    expect(doc.semanticText).toContain('Attributes:');
    expect(doc.semanticText).not.toContain('<p>');
    expect(doc.categoryIds).toEqual(['66666666-6666-7666-8666-666666666666']);
    expect(doc.searchable).toBe(true);
  });

  it('does not mutate source categoryIds when building the document', () => {
    const categoryIds = ['cat-a', 'cat-b'];
    const source = {
      ...baseSource,
      categoryIds,
    };
    const doc = buildOfferSearchDocument(source);
    expect(doc.categoryIds).toEqual(categoryIds);
    expect(doc.categoryIds).not.toBe(categoryIds);
    categoryIds.push('cat-c');
    expect(doc.categoryIds).toEqual(['cat-a', 'cat-b']);
  });
});
