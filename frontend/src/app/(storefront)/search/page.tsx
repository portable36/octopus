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
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">
          Offer search via Nest API (never Meilisearch from the browser). Filters live in the URL.
        </p>
      </header>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading filters…</p>}>
        <SearchFiltersForm />
      </Suspense>

      {query.categoryId || query.storeId || query.vendorId ? (
        <p className="text-xs text-muted-foreground">
          Scoped
          {query.categoryId ? ` · category ${query.categoryId}` : ''}
          {query.storeId ? ` · store ${query.storeId}` : ''}
          {query.vendorId ? ` · vendor ${query.vendorId}` : ''}
          {' · '}
          <Link href="/search" className="underline">
            clear scope
          </Link>
        </p>
      ) : null}

      {loadError ? (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : result && result.hits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matching offers.</p>
      ) : result ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Showing {result.hits.length} of ~{result.estimatedTotal}
            {result.query ? ` for “${result.query}”` : ''}
          </p>
          <div className="sm:grid sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
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
              className="inline-flex text-sm font-medium hover:underline"
            >
              Next page
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
