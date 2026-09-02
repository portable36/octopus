import { describe, expect, it } from 'vitest';
import { cmsSlugToEntityId, parsePublicSeoPath } from './parse-seo-path';

describe('parsePublicSeoPath', () => {
  it('parses product, category, and cms paths', () => {
    expect(parsePublicSeoPath('/products/abc-123')).toEqual({
      kind: 'product',
      productId: 'abc-123',
    });
    expect(parsePublicSeoPath('/categories/electronics')).toEqual({
      kind: 'category',
      slug: 'electronics',
    });
    const cms = parsePublicSeoPath('/pages/about-us');
    expect(cms?.kind).toBe('cms');
    if (cms?.kind === 'cms') {
      expect(cms.slug).toBe('about-us');
      expect(cms.entityId).toBe(cmsSlugToEntityId('about-us'));
    }
  });

  it('returns null for unsupported paths', () => {
    expect(parsePublicSeoPath('/checkout')).toBeNull();
  });
});
