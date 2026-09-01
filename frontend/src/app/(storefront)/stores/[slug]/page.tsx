import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { OfferCard } from '@/components/storefront/offer-card';
import { SearchFiltersForm } from '@/components/storefront/search-filters-form';
import { JsonLd } from '@/components/seo/json-ld';
import { ApiClientError } from '@/lib/api-client';
import { breadcrumbJsonLd, hasFacetSearchParams, storeMetadata } from '@/lib/seo';
import { fetchPublicStoreBySlug, isNotFound, searchProducts } from '@/lib/storefront-api';

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
    const store = await fetchPublicStoreBySlug(slug, first(sp.vendorId));
    const meta = storeMetadata(store);
    if (hasFacetSearchParams(sp)) {
      return { ...meta, robots: { index: false, follow: true } };
    }
    return meta;
  } catch {
    return { title: 'Store' };
  }
}

export default async function StorePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const vendorId = first(sp.vendorId);

  let store;
  try {
    store = await fetchPublicStoreBySlug(slug, vendorId);
  } catch (error) {
    if (isNotFound(error)) {
      notFound();
    }
    throw error;
  }

  const page = Number(first(sp.page) ?? '1') || 1;
  let result: Awaited<ReturnType<typeof searchProducts>> | null = null;
  let offersError: string | null = null;
  try {
    result = await searchProducts({
      storeId: store.id,
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
          { name: store.displayName, path: `/stores/${store.slug}` },
        ])}
      />
      <header className="space-y-3">
        <p className="sf-eyebrow">Store</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{store.displayName}</h1>
        {store.description ? (
          <p className="max-w-2xl text-muted-foreground">{store.description}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          /{store.slug} · {store.currencyCode}
          {store.acceptsOnlineOrders ? ' · accepts online orders' : ''}
        </p>
        {store.vendorSlug ? (
          <p className="text-sm">
            <Link
              href={`/shops/${store.vendorSlug}`}
              className="font-semibold underline underline-offset-4"
            >
              View vendor shop
            </Link>
          </p>
        ) : null}
      </header>

      <div className="sf-browse-grid">
        <aside className="sf-filter-panel">
          <details className="sf-filter-details" open>
            <summary>Refine results</summary>
            <Suspense fallback={<p className="text-sm text-muted-foreground">Loading filters…</p>}>
              <SearchFiltersForm actionPath={`/stores/${store.slug}`} />
            </Suspense>
          </details>
        </aside>
        <section className="min-w-0" aria-labelledby="store-offers">
          <div className="sf-section-heading mb-5">
            <h2 id="store-offers">Offers in this store</h2>
            {result ? (
              <span className="text-sm text-muted-foreground">
                {result.hits.length} of ~{result.estimatedTotal}
              </span>
            ) : null}
          </div>

          {offersError ? (
            <p className="sf-panel text-sm text-destructive" role="alert">
              {offersError}
            </p>
          ) : result && result.hits.length === 0 ? (
            <p className="sf-panel text-sm text-muted-foreground">No offers for this store yet.</p>
          ) : result ? (
            <div className="space-y-4">
              <div className="sf-results-grid">
                {result.hits.map((hit) => (
                  <OfferCard key={hit.id} hit={hit} />
                ))}
              </div>
              {result.estimatedTotal > result.limit * result.page ? (
                <Link
                  href={`/stores/${store.slug}?${new URLSearchParams({
                    ...(vendorId ? { vendorId } : {}),
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
              <Link
                href={`/search?storeId=${encodeURIComponent(store.id)}`}
                className="inline-flex text-sm font-semibold underline underline-offset-4"
              >
                Open in search
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
