import { apiRequest, ApiClientError } from '@/lib/api-client';

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  seo: { title: string | null; description: string | null };
};

export type PublicStore = {
  id: string;
  vendorId: string;
  vendorSlug: string | null;
  slug: string;
  displayName: string;
  description: string | null;
  currencyCode: string;
  acceptsOnlineOrders: boolean;
};

export type PublicVendorShop = {
  id: string;
  slug: string;
  displayName: string;
  description: string | null;
  stores: readonly {
    id: string;
    slug: string;
    displayName: string;
    description: string | null;
    currencyCode: string;
    acceptsOnlineOrders: boolean;
  }[];
};

export type CatalogMediaRef = {
  mediaId: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | '360_VIEW';
  isPrimary: boolean;
  sortOrder: number;
  url: string | null;
};

export type PublicProduct = {
  id: string;
  vendorId: string;
  name: string;
  description: string | null;
  brandId: string | null;
  categoryIds: readonly string[];
  media: readonly CatalogMediaRef[];
  slug: string;
  variants: readonly {
    id: string;
    sku: string;
    name: string;
    status: string;
    attributes: readonly { code: string; value: string | number | boolean | readonly string[] }[];
    media: readonly CatalogMediaRef[];
  }[];
  offers: readonly {
    id: string;
    storeId: string;
    variantId: string;
    priceMinor: number;
    currencyCode: string;
    isAvailable: boolean;
  }[];
};

export type SearchHit = {
  id: string;
  offerId: string;
  productId: string;
  variantId: string;
  vendorId: string;
  storeId: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  priceMinor: number;
  currencyCode: string;
  stockStatus: string;
  primaryImageUrl: string | null;
};

export type SearchResult = {
  hits: readonly SearchHit[];
  query: string;
  page: number;
  limit: number;
  estimatedTotal: number;
  facets: {
    categoryIds: readonly { value: string; count: number }[];
    vendorId: readonly { value: string; count: number }[];
    storeId: readonly { value: string; count: number }[];
    stockStatus: readonly { value: string; count: number }[];
  };
};

export type SearchQuery = {
  q?: string;
  categoryId?: string;
  storeId?: string;
  vendorId?: string;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  stockStatus?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

function toQueryString(params: SearchQuery): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') {
      continue;
    }
    sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchPublicCategories(): Promise<PublicCategory[]> {
  return apiRequest<PublicCategory[]>('/public/categories');
}

export async function fetchPublicCategoryBySlug(slug: string): Promise<PublicCategory> {
  return apiRequest<PublicCategory>(`/public/categories/${encodeURIComponent(slug)}`);
}

export async function fetchPublicProduct(productId: string): Promise<PublicProduct> {
  return apiRequest<PublicProduct>(`/public/products/${encodeURIComponent(productId)}`);
}

export async function fetchPublicStoreBySlug(
  slug: string,
  vendorId?: string,
): Promise<PublicStore> {
  const qs = vendorId ? `?vendorId=${encodeURIComponent(vendorId)}` : '';
  return apiRequest<PublicStore>(`/public/stores/by-slug/${encodeURIComponent(slug)}${qs}`);
}

export async function fetchPublicVendorShopBySlug(slug: string): Promise<PublicVendorShop> {
  return apiRequest<PublicVendorShop>(`/public/vendors/by-slug/${encodeURIComponent(slug)}`);
}

export async function searchProducts(query: SearchQuery): Promise<SearchResult> {
  return apiRequest<SearchResult>(`/search/products${toQueryString(query)}`);
}

export type SitemapProductEntry = {
  id: string;
  updatedAt: string;
};

/** Published product ids from catalog DB (not Meilisearch). */
export async function fetchSitemapProducts(): Promise<SitemapProductEntry[]> {
  return apiRequest<SitemapProductEntry[]>('/public/sitemap/products');
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 404;
}

export function formatMoney(minor: number, currencyCode: string): string {
  const major = (minor / 100).toFixed(2);
  return `${currencyCode} ${major}`;
}
