import { readAnalyticsConsent } from '@/components/marketing/consent-manager';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/** GA4 / GTM enhanced e-commerce item (GEM + Meta Andromeda-friendly fields). */
export type ECommerceItem = {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly sku: string;
  readonly brand?: string;
  readonly category?: string;
  readonly itemListName?: string;
  readonly quantity?: number;
};

type ECommerceEventBase = {
  readonly currency: string;
  readonly value: number;
  readonly items: readonly ECommerceItem[];
  /** GA4 collection / list context for funnel and visibility reporting. */
  readonly itemListName?: string;
  readonly itemCategory?: string;
};

export type ViewItemEvent = ECommerceEventBase & { readonly event: 'view_item' };
export type AddToCartEvent = ECommerceEventBase & { readonly event: 'add_to_cart' };
export type BeginCheckoutEvent = ECommerceEventBase & { readonly event: 'begin_checkout' };
export type PurchaseEvent = ECommerceEventBase & {
  readonly event: 'purchase';
  readonly transaction_id: string;
};

export type ECommerceEvent = ViewItemEvent | AddToCartEvent | BeginCheckoutEvent | PurchaseEvent;

export type ViewSearchResultsEvent = {
  readonly event: 'view_search_results';
  readonly search_term: string;
  readonly search_results_count: number;
};

export type DataLayerEvent = ECommerceEvent | ViewSearchResultsEvent;

const MAX_SEARCH_TERM_LENGTH = 100;

/** Strip control chars, HTML, and inline event-handler patterns before analytics export. */
export function sanitizeSearchTerm(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/\bon\w+\s*=/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_SEARCH_TERM_LENGTH);
}

function ensureDataLayer(): Record<string, unknown>[] {
  if (typeof window === 'undefined') {
    return [];
  }
  window.dataLayer = window.dataLayer ?? [];
  return window.dataLayer;
}

function toGa4Item(item: ECommerceItem): Record<string, unknown> {
  const quantity = item.quantity ?? 1;
  const listName = item.itemListName;
  return {
    item_id: item.id,
    item_name: item.name,
    price: item.price,
    quantity,
    item_sku: item.sku,
    ...(item.brand ? { item_brand: item.brand, brand: item.brand } : {}),
    ...(item.category ? { item_category: item.category, category: item.category } : {}),
    ...(listName ? { item_list_name: listName, item_list_id: listName } : {}),
    id: item.id,
    name: item.name,
    sku: item.sku,
  };
}

function toGa4EcommercePayload(event: ECommerceEvent): Record<string, unknown> {
  const ecommerce: Record<string, unknown> = {
    currency: event.currency,
    value: event.value,
    items: event.items.map(toGa4Item),
  };

  if (event.itemListName) {
    ecommerce.item_list_name = event.itemListName;
    ecommerce.item_list_id = event.itemListName;
  }
  if (event.itemCategory) {
    ecommerce.item_category = event.itemCategory;
  }

  if (event.event === 'purchase') {
    ecommerce.transaction_id = event.transaction_id;
  }

  return ecommerce;
}

function toGa4Payload(event: ECommerceEvent): Record<string, unknown> {
  return {
    event: event.event,
    ecommerce: toGa4EcommercePayload(event),
  };
}

function pushRaw(payload: Record<string, unknown>, options?: { readonly clearEcommerce?: boolean }): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (!readAnalyticsConsent()) {
    return;
  }

  const layer = ensureDataLayer();
  if (options?.clearEcommerce !== false) {
    layer.push({ ecommerce: null });
  }
  layer.push(payload);
}

/** Push a GA4-compatible enhanced e-commerce event to `window.dataLayer` (GTM / Meta via tags). */
export function pushToDataLayer(event: ECommerceEvent): void {
  pushRaw(toGa4Payload(event));
}

/** GA4 Enhanced Measurement: site search intent with sanitized keyword + result count. */
export function trackSiteSearch(keyword: string, resultsCount: number): void {
  const searchTerm = sanitizeSearchTerm(keyword);
  if (!searchTerm) {
    return;
  }

  pushRaw(
    {
      event: 'view_search_results',
      search_term: searchTerm,
      search_results_count: Math.max(0, Math.floor(resultsCount)),
    },
    { clearEcommerce: false },
  );
}

export function minorToMajor(priceMinor: number): number {
  return Number((priceMinor / 100).toFixed(2));
}
