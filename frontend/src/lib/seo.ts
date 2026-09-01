import type { Metadata } from 'next';
import { getPublicAppName, getPublicSiteUrl } from '@/lib/env';
import type {
  PublicCategory,
  PublicProduct,
  PublicStore,
  PublicVendorShop,
} from '@/lib/storefront-api';

export function absoluteUrl(path: string): string {
  const base = getPublicSiteUrl();
  if (!path || path === '/') {
    return base;
  }
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function categoryMetadata(category: PublicCategory): Metadata {
  const title = category.seo.title?.trim() || category.name;
  const description =
    category.seo.description?.trim() || `${category.name} on ${getPublicAppName()}`;
  const url = absoluteUrl(`/categories/${category.slug}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
  };
}

/** Faceted/filter querystrings: noindex and canonical to clean category URL. */
export function categoryMetadataWithFacets(
  category: PublicCategory,
  hasFacetQuery: boolean,
): Metadata {
  const base = categoryMetadata(category);
  if (!hasFacetQuery) {
    return base;
  }
  return {
    ...base,
    robots: { index: false, follow: true },
  };
}

export function productMetadata(product: PublicProduct): Metadata {
  const title = product.name;
  const description =
    product.description?.trim().slice(0, 300) || `${product.name} on ${getPublicAppName()}`;
  const url = absoluteUrl(`/products/${product.id}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
  };
}

export function storeMetadata(store: PublicStore): Metadata {
  const title = store.displayName;
  const description =
    store.description?.trim().slice(0, 300) || `${store.displayName} on ${getPublicAppName()}`;
  const url = absoluteUrl(`/stores/${store.slug}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
  };
}

export function vendorShopMetadata(vendor: PublicVendorShop): Metadata {
  const title = vendor.displayName;
  const description =
    vendor.description?.trim().slice(0, 300) || `${vendor.displayName} on ${getPublicAppName()}`;
  const url = absoluteUrl(`/shops/${vendor.slug}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
  };
}

export function vendorShopMetadataWithFacets(
  vendor: PublicVendorShop,
  hasFacetQuery: boolean,
): Metadata {
  const base = vendorShopMetadata(vendor);
  if (!hasFacetQuery) {
    return base;
  }
  return {
    ...base,
    robots: { index: false, follow: true },
  };
}

export function hasFacetSearchParams(sp: Record<string, string | string[] | undefined>): boolean {
  const keys = ['q', 'sort', 'minPriceMinor', 'maxPriceMinor', 'stockStatus', 'page'] as const;
  for (const key of keys) {
    const value = sp[key];
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw === undefined || raw === '') {
      continue;
    }
    if (key === 'page' && (raw === '1' || raw === '0')) {
      continue;
    }
    if (key === 'sort' && raw === 'relevance') {
      continue;
    }
    return true;
  }
  return false;
}

export function breadcrumbJsonLd(
  items: readonly { name: string; path: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Fact-gated Product JSON-LD — no AggregateRating / Review. */
export function productJsonLd(product: PublicProduct): Record<string, unknown> {
  const offers = product.offers
    .filter((o) => o.isAvailable)
    .map((o) => ({
      '@type': 'Offer',
      price: (o.priceMinor / 100).toFixed(2),
      priceCurrency: o.currencyCode,
      availability: 'https://schema.org/InStock',
      url: absoluteUrl(`/products/${product.id}`),
    }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    sku: product.variants[0]?.sku,
    offers:
      offers.length === 1
        ? offers[0]
        : offers.length > 1
          ? offers
          : {
              '@type': 'Offer',
              availability: 'https://schema.org/OutOfStock',
              url: absoluteUrl(`/products/${product.id}`),
            },
  };
}
