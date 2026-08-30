import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { OfferCard } from '@/components/storefront/offer-card';
import { SearchFiltersForm } from '@/components/storefront/search-filters-form';
import { JsonLd } from '@/components/seo/json-ld';
import { ApiClientError } from '@/lib/api-client';
import { breadcrumbJsonLd, categoryMetadataWithFacets, hasFacetSearchParams } from '@/lib/seo';
import { fetchPublicCategoryBySlug, isNotFound, searchProducts } from '@/lib/storefront-api';

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
    const category = await fetchPublicCategoryBySlug(slug);
    return categoryMetadataWithFacets(category, hasFacetSearchParams(sp));
  } catch {
    return { title: 'Category' };
  }
}

export default async function CategoryDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  let category;
  try {
    category = await fetchPublicCategoryBySlug(slug);
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
      categoryId: category.id,
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
          { name: 'Categories', path: '/categories' },
          { name: category.name, path: `/categories/${category.slug}` },
        ])}
      />
      <header className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <Link href="/categories" className="hover:underline">
            Categories
          </Link>
          <span aria-hidden="true"> / </span>
          {category.name}
        </p>
        <p className="sf-eyebrow">Collection</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          {category.seo.title ?? category.name}
        </h1>
        {category.seo.description ? (
          <p className="max-w-2xl text-muted-foreground">{category.seo.description}</p>
        ) : null}
      </header>

      <div className="sf-browse-grid">
        <aside className="sf-filter-panel">
          <details className="sf-filter-details" open>
            <summary>Refine results</summary>
            <Suspense fallback={<p className="text-sm text-muted-foreground">Loading filters…</p>}>
              <SearchFiltersForm actionPath={`/categories/${category.slug}`} />
            </Suspense>
          </details>
        </aside>
        <section className="min-w-0" aria-labelledby="category-offers">
          <div className="sf-section-heading mb-5">
            <h2 id="category-offers">Offers in this collection</h2>
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
            <p className="sf-panel text-sm text-muted-foreground">
              This collection has no matching offers yet.
            </p>
          ) : result ? (
            <div className="sf-results-grid">
              {result.hits.map((hit) => (
                <OfferCard key={hit.id} hit={hit} />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
