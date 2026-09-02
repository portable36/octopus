import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pushToDataLayer, sanitizeSearchTerm, trackSiteSearch } from '../dataLayer';

vi.mock('@/components/marketing/consent-manager', () => ({
  readAnalyticsConsent: () => true,
}));

describe('pushToDataLayer', () => {
  let dataLayer: Record<string, unknown>[];

  beforeEach(() => {
    dataLayer = [];
    vi.stubGlobal('window', { dataLayer } as Window & typeof globalThis);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pushes GA4 structured ecommerce objects onto window.dataLayer', () => {
    pushToDataLayer({
      event: 'view_item',
      currency: 'BDT',
      value: 24.99,
      items: [
        {
          id: 'prod-1',
          name: 'Wireless Mouse',
          price: 24.99,
          sku: 'SKU-001',
          brand: 'Acme',
          category: 'electronics',
          quantity: 1,
        },
      ],
    });

    expect(dataLayer).toHaveLength(2);
    expect(dataLayer[0]).toEqual({ ecommerce: null });

    const payload = dataLayer[1] as {
      event: string;
      ecommerce: {
        currency: string;
        value: number;
        items: Array<Record<string, unknown>>;
      };
    };

    expect(payload.event).toBe('view_item');
    expect(payload.ecommerce.currency).toBe('BDT');
    expect(payload.ecommerce.value).toBe(24.99);
    expect(payload.ecommerce.items[0]).toMatchObject({
      item_id: 'prod-1',
      item_name: 'Wireless Mouse',
      price: 24.99,
      item_sku: 'SKU-001',
      sku: 'SKU-001',
    });
  });

  it('includes transaction_id for purchase events', () => {
    pushToDataLayer({
      event: 'purchase',
      transaction_id: 'checkout-abc',
      currency: 'BDT',
      value: 1500,
      items: [
        {
          id: 'prod-2',
          name: 'USB Hub',
          price: 1500,
          sku: 'HUB-01',
        },
      ],
    });

    const payload = dataLayer[1] as {
      ecommerce: { transaction_id: string };
    };
    expect(payload.ecommerce.transaction_id).toBe('checkout-abc');
  });

  it('does not throw when optional item fields are missing', () => {
    expect(() => {
      pushToDataLayer({
        event: 'add_to_cart',
        currency: 'BDT',
        value: 10,
        items: [{ id: 'x', name: 'Item', price: 10, sku: 'SKU' }],
      });
    }).not.toThrow();
    expect(dataLayer.length).toBeGreaterThan(0);
  });

  it('maps item_list_name and item_category on view_item payloads', () => {
    pushToDataLayer({
      event: 'view_item',
      currency: 'BDT',
      value: 99,
      itemListName: 'Summer Sale',
      itemCategory: 'apparel',
      items: [
        {
          id: 'prod-3',
          name: 'Tee',
          price: 99,
          sku: 'TEE-01',
          itemListName: 'Summer Sale',
          category: 'apparel',
        },
      ],
    });

    const payload = dataLayer[1] as {
      ecommerce: {
        item_list_name: string;
        item_category: string;
        items: Array<Record<string, unknown>>;
      };
    };

    expect(payload.ecommerce.item_list_name).toBe('Summer Sale');
    expect(payload.ecommerce.item_category).toBe('apparel');
    expect(payload.ecommerce.items[0]?.item_list_name).toBe('Summer Sale');
    expect(payload.ecommerce.items[0]?.item_category).toBe('apparel');
  });
});

describe('trackSiteSearch', () => {
  let dataLayer: Record<string, unknown>[];

  beforeEach(() => {
    dataLayer = [];
    vi.stubGlobal('window', { dataLayer } as Window & typeof globalThis);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pushes view_search_results with search_term and search_results_count', () => {
    trackSiteSearch('wireless keyboard', 12);

    expect(dataLayer).toHaveLength(1);
    expect(dataLayer[0]).toEqual({
      event: 'view_search_results',
      search_term: 'wireless keyboard',
      search_results_count: 12,
    });
  });

  it('strips unsafe input before pushing search_term', () => {
    trackSiteSearch('<img src=x onerror=alert(1)> shoes', 3);

    const payload = dataLayer[0] as { search_term: string };
    expect(payload.search_term).toBe('shoes');
    expect(payload.search_term).not.toContain('<');
    expect(payload.search_term).not.toContain('onerror');
  });

  it('does not push when keyword sanitizes to empty', () => {
    trackSiteSearch('   <img onerror=x>   ', 0);
    expect(dataLayer).toHaveLength(0);
  });
});

describe('sanitizeSearchTerm', () => {
  it('removes control characters and collapses whitespace', () => {
    expect(sanitizeSearchTerm('  hello\u0007  world  ')).toBe('hello world');
  });

  it('strips javascript: protocol fragments', () => {
    expect(sanitizeSearchTerm('javascript:alert(1)')).toBe('alert(1)');
  });
});
