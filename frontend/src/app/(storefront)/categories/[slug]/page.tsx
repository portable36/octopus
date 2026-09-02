import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { TaxonomyKeywordAttributes } from '@/components/seo/TaxonomyKeywordAttributes';
import { OfferCard } from '@/components/storefront/offer-card';
import { SearchResultsAnalytics } from '@/components/storefront/search-results-analytics';
import { SearchFiltersForm } from '@/components/storefront/search-filters-form';
import { StructuredData } from '@/components/seo/StructuredData';
import { buildTaxonomyKeywords } from '@/infrastructure/analytics/taxonomy-keywords';
import { ApiClientError } from '@/lib/api-client';
import { fetchSeoPageContext, isSeoNotFound } from '@/lib/seo-discovery-api';
import { toNextMetadata } from '@/lib/seo-metadata-factory';
import { hasFacetSearchParams } from '@/lib/seo';
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
    const context = await fetchSeoPageContext(`/categories/${slug}`);
    const metadata = toNextMetadata(context);
    if (hasFacetSearchParams(sp)) {
      return { ...metadata, robots: { index: false, follow: true } };
    }
    return metadata;
  } catch {
    return { title: 'Category' };
  }
}

export default async function CategoryDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  let category;
  let seoContext;
  try {
    [category, seoContext] = await Promise.all([
      fetchPublicCategoryBySlug(slug),
      fetchSeoPageContext(`/categories/${slug}`),
    ]);
  } catch (error) {
    if (isNotFound(error) || isSeoNotFound(error)) {
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

  const categoryQuery = first(sp.q) ?? '';
  const taxonomyKeywords = buildTaxonomyKeywords({ categoryNames: [category.name] });

  return (
    <div className="space-y-8">
      <TaxonomyKeywordAttributes keywords={taxonomyKeywords} />
      {categoryQuery ? (
        <SearchResultsAnalytics
          query={categoryQuery}
          resultsCount={result?.estimatedTotal ?? 0}
        />
      ) : null}
      {seoContext.structuredData.map((block, index) => (
        <StructuredData key={`seo-ld-${index}`} data={block} />
      ))}
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
          {seoContext.metadata.title}
        </h1>
        {seoContext.metadata.description ? (
          <p className="max-w-2xl text-muted-foreground">{seoContext.metadata.description}</p>
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
