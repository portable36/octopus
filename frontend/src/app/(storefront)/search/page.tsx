import Link from 'next/link';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OfferCard } from '@/components/storefront/offer-card';
import { SearchFiltersForm } from '@/components/storefront/search-filters-form';
import { ApiClientError } from '@/lib/api-client';
import { absoluteUrl } from '@/lib/seo';
import { searchProducts } from '@/lib/storefront-api';

type Props = {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search sellable offers',
  robots: { index: false, follow: true },
  alternates: { canonical: absoluteUrl('/search') },
};

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Number(first(sp.page) ?? '1') || 1;
  const query = {
    q: first(sp.q),
    categoryId: first(sp.categoryId),
    storeId: first(sp.storeId),
    vendorId: first(sp.vendorId),
    sort: first(sp.sort),
    minPriceMinor: first(sp.minPriceMinor) ? Number(first(sp.minPriceMinor)) : undefined,
    maxPriceMinor: first(sp.maxPriceMinor) ? Number(first(sp.maxPriceMinor)) : undefined,
    stockStatus: first(sp.stockStatus),
    page,
    limit: 24,
  };

  let result: Awaited<ReturnType<typeof searchProducts>> | null = null;
  let loadError: string | null = null;
  try {
    result = await searchProducts(query);
  } catch (error) {
    loadError =
      error instanceof ApiClientError ? error.message : 'Search is temporarily unavailable.';
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="sf-eyebrow">Browse the marketplace</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Search offers</h1>
        <p className="max-w-2xl text-muted-foreground">
          Search published products across stores. Filters stay in the URL so you can share or
          revisit a result.
        </p>
      </header>

      <div className="sf-browse-grid">
        <aside className="sf-filter-panel">
          <details className="sf-filter-details" open>
            <summary>Refine results</summary>
            <Suspense fallback={<p className="text-sm text-muted-foreground">Loading filters…</p>}>
              <SearchFiltersForm />
            </Suspense>
          </details>
        </aside>
        <section className="min-w-0" aria-labelledby="search-results">
          <div className="sf-section-heading mb-5">
            <h2 id="search-results">Latest offers</h2>
            {result ? (
              <span className="text-sm text-muted-foreground">
                {result.hits.length} of ~{result.estimatedTotal}
              </span>
            ) : null}
          </div>

          {query.categoryId || query.storeId || query.vendorId ? (
            <p className="mb-4 text-xs text-muted-foreground">
              Scoped
              {query.categoryId ? ` · category ${query.categoryId}` : ''}
              {query.storeId ? ` · store ${query.storeId}` : ''}
              {query.vendorId ? ` · vendor ${query.vendorId}` : ''}
              {' · '}
              <Link href="/search" className="font-semibold underline underline-offset-4">
                clear scope
              </Link>
            </p>
          ) : null}

          {loadError ? (
            <p className="sf-panel text-sm text-destructive" role="alert">
              {loadError}
            </p>
          ) : result && result.hits.length === 0 ? (
            <p className="sf-panel text-sm text-muted-foreground">
              No matching offers yet. Try a wider search or clear a filter.
            </p>
          ) : result ? (
            <div className="space-y-4">
              {result.query ? (
                <p className="text-sm text-muted-foreground">Results for “{result.query}”</p>
              ) : null}
              <div className="sf-results-grid">
                {result.hits.map((hit) => (
                  <OfferCard key={hit.id} hit={hit} />
                ))}
              </div>
              {result.estimatedTotal > result.limit * result.page ? (
                <Link
                  href={`/search?${new URLSearchParams({
                    ...(query.q ? { q: query.q } : {}),
                    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
                    ...(query.storeId ? { storeId: query.storeId } : {}),
                    ...(query.vendorId ? { vendorId: query.vendorId } : {}),
                    ...(query.sort ? { sort: query.sort } : {}),
                    ...(query.minPriceMinor !== undefined
                      ? { minPriceMinor: String(query.minPriceMinor) }
                      : {}),
                    ...(query.maxPriceMinor !== undefined
                      ? { maxPriceMinor: String(query.maxPriceMinor) }
                      : {}),
                    ...(query.stockStatus ? { stockStatus: query.stockStatus } : {}),
                    page: String(page + 1),
                  }).toString()}`}
                  className="sf-button-secondary"
                >
                  Next page
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
