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

  let result: Awaited<ReturnType<typeof searchProducts>> | null = null;
  let offersError: string | null = null;
  try {
    result = await searchProducts({
      storeId: store.id,
      q: first(sp.q),
      sort: first(sp.sort),
      page: Number(first(sp.page) ?? '1') || 1,
      limit: 24,
    });
  } catch (error) {
    offersError =
      error instanceof ApiClientError ? error.message : 'Search is temporarily unavailable.';
  }

  return (
    <div className="space-y-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: store.displayName, path: `/stores/${store.slug}` },
        ])}
      />
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{store.displayName}</h1>
        {store.description ? (
          <p className="max-w-2xl text-muted-foreground">{store.description}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          /{store.slug} · {store.currencyCode}
          {store.acceptsOnlineOrders ? ' · accepts online orders' : ''}
        </p>
      </header>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading filters…</p>}>
        <SearchFiltersForm actionPath={`/stores/${store.slug}`} />
      </Suspense>

      {offersError ? (
        <p className="text-sm text-destructive" role="alert">
          {offersError}
        </p>
      ) : result && result.hits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No offers for this store yet.</p>
      ) : result ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Showing {result.hits.length} of ~{result.estimatedTotal}
          </p>
          <div className="sm:grid sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {result.hits.map((hit) => (
              <OfferCard key={hit.id} hit={hit} />
            ))}
          </div>
          <Link
            href={`/search?storeId=${encodeURIComponent(store.id)}`}
            className="inline-flex text-sm hover:underline"
          >
            Open in search
          </Link>
        </div>
      ) : null}
    </div>
  );
}
