import { describe, expect, it } from 'vitest';
import { createDraftSku } from './vendor-catalog-flow';

describe('createDraftSku', () => {
  it('matches catalog SKU format ABC-DEF-1234', () => {
    const sku = createDraftSku();
    expect(sku).toMatch(/^[A-Z]{3}-[A-Z]{3}-\d{4}$/);
    expect(sku.startsWith('DRF-NEW-')).toBe(true);
  });
});
