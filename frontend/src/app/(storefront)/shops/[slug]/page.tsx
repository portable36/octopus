import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { OfferCard } from '@/components/storefront/offer-card';
import { SearchFiltersForm } from '@/components/storefront/search-filters-form';
import { JsonLd } from '@/components/seo/json-ld';
import { ApiClientError } from '@/lib/api-client';
import { breadcrumbJsonLd, hasFacetSearchParams, vendorShopMetadataWithFacets } from '@/lib/seo';
import { fetchPublicVendorShopBySlug, isNotFound, searchProducts } from '@/lib/storefront-api';

export const revalidate = 60;

type Props = {
  readonly params: Promise<{ slug: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  try {
    const vendor = await fetchPublicVendorShopBySlug(slug);
    return vendorShopMetadataWithFacets(vendor, hasFacetSearchParams(sp));
  } catch {
    return { title: 'Shop' };
  }
}

export default async function VendorShopPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const selectedStoreId = first(sp.storeId);

  let vendor;
  try {
    vendor = await fetchPublicVendorShopBySlug(slug);
  } catch (error) {
    if (isNotFound(error)) {
      notFound();
    }
    throw error;
  }

  const page = Number(first(sp.page) ?? '1') || 1;
  let offersError: string | null = null;
  let result: Awaited<ReturnType<typeof searchProducts>> | null = null;
  try {
    result = await searchProducts({
      vendorId: vendor.id,
      ...(selectedStoreId ? { storeId: selectedStoreId } : {}),
      q: first(sp.q),
      sort: first(sp.sort),
      minPriceMinor: first(sp.minPriceMinor) ? Number(first(sp.minPriceMinor)) : undefined,
      maxPriceMinor: first(sp.maxPriceMinor) ? Number(first(sp.maxPriceMinor)) : undefined,
      stockStatus: first(sp.stockStatus),
      page,
      limit: 24,
    });
  } catch (error) {
    offersError =
      error instanceof ApiClientError ? error.message : 'Search is temporarily unavailable.';
  }

  return (
    <div className="space-y-8">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: vendor.displayName, path: `/shops/${vendor.slug}` },
        ])}
      />
      <header className="space-y-3">
        <p className="sf-eyebrow">Vendor shop</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{vendor.displayName}</h1>
        {vendor.description ? (
          <p className="max-w-2xl text-muted-foreground">{vendor.description}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">/{vendor.slug}</p>
      </header>

      {vendor.stores.length > 0 ? (
        <nav className="flex flex-wrap gap-2" aria-label="Vendor stores">
          <Link
            href={`/shops/${vendor.slug}`}
            className={
              selectedStoreId
                ? 'rounded-full border border-border px-3 py-1 text-sm hover:border-foreground'
                : 'rounded-full border border-foreground bg-foreground px-3 py-1 text-sm text-background'
            }
          >
            All stores
          </Link>
          {vendor.stores.map((store) => {
            const active = selectedStoreId === store.id;
            const href = `/shops/${vendor.slug}?storeId=${encodeURIComponent(store.id)}`;
            return (
              <Link
                key={store.id}
                href={href}
                className={
                  active
                    ? 'rounded-full border border-foreground bg-foreground px-3 py-1 text-sm text-background'
                    : 'rounded-full border border-border px-3 py-1 text-sm hover:border-foreground'
                }
              >
                {store.displayName}
              </Link>
            );
          })}
        </nav>
      ) : null}

      <div className="sf-browse-grid">
        <aside className="sf-filter-panel">
          <details className="sf-filter-details" open>
            <summary>Refine results</summary>
            <Suspense fallback={<p className="text-sm text-muted-foreground">Loading filters…</p>}>
              <SearchFiltersForm actionPath={`/shops/${vendor.slug}`} />
            </Suspense>
          </details>
        </aside>
        <section className="min-w-0" aria-labelledby="vendor-offers">
          <div className="sf-section-heading mb-5">
            <h2 id="vendor-offers">Offers from this vendor</h2>
            {result ? (
              <span className="text-sm text-muted-foreground">
                {result.hits.length} of ~{result.estimatedTotal}
              </span>
            ) : null}
          </div>

          {selectedStoreId ? (
            <p className="mb-4 text-xs text-muted-foreground">
              Filtered to one store ·{' '}
              <Link
                href={`/shops/${vendor.slug}`}
                className="font-semibold underline underline-offset-4"
              >
                show all stores
              </Link>
            </p>
          ) : null}

          {offersError ? (
            <p className="sf-panel text-sm text-destructive" role="alert">
              {offersError}
            </p>
          ) : result && result.hits.length === 0 ? (
            <p className="sf-panel text-sm text-muted-foreground">
              This vendor has no matching offers yet.
            </p>
          ) : result ? (
            <div className="space-y-4">
              <div className="sf-results-grid">
                {result.hits.map((hit) => (
                  <OfferCard key={hit.id} hit={hit} />
                ))}
              </div>
              {result.estimatedTotal > result.limit * result.page ? (
                <Link
                  href={`/shops/${vendor.slug}?${new URLSearchParams({
                    ...(selectedStoreId ? { storeId: selectedStoreId } : {}),
                    ...(first(sp.q) ? { q: first(sp.q)! } : {}),
                    ...(first(sp.sort) ? { sort: first(sp.sort)! } : {}),
                    ...(first(sp.minPriceMinor) ? { minPriceMinor: first(sp.minPriceMinor)! } : {}),
                    ...(first(sp.maxPriceMinor) ? { maxPriceMinor: first(sp.maxPriceMinor)! } : {}),
                    ...(first(sp.stockStatus) ? { stockStatus: first(sp.stockStatus)! } : {}),
                    page: String(page + 1),
                  }).toString()}`}
                  className="sf-button-secondary"
                >
                  Next page
                </Link>
              ) : null}
            </div>
          ) : null}

          {vendor.stores.length > 0 ? (
            <section className="mt-8 space-y-3">
              <h3 className="text-sm font-medium">Store locations</h3>
              <ul className="space-y-2 text-sm">
                {vendor.stores.map((store) => (
                  <li
                    key={store.id}
                    className="rounded-md border border-border bg-background px-3 py-2"
                  >
                    <Link
                      href={`/stores/${store.slug}?vendorId=${encodeURIComponent(vendor.id)}`}
                      className="font-medium hover:underline"
                    >
                      {store.displayName}
                    </Link>
                    {store.description ? (
                      <p className="text-muted-foreground">{store.description}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      /{store.slug} · {store.currencyCode}
                      {store.acceptsOnlineOrders ? ' · online orders' : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </section>
      </div>
    </div>
  );
}
