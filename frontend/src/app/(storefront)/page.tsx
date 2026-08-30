import Link from 'next/link';
import type { Metadata } from 'next';
import { ApiClientError } from '@/lib/api-client';
import { getPublicAppName } from '@/lib/env';
import { absoluteUrl } from '@/lib/seo';
import { fetchPublicCategories } from '@/lib/storefront-api';

/** Catalog browse data — soft cache; mutations go through admin/vendor APIs. */
export const revalidate = 60;

export const metadata: Metadata = {
  title: getPublicAppName(),
  description: 'Browse published categories and sellable offers',
  alternates: { canonical: absoluteUrl('/') },
};

export default async function StorefrontHomePage() {
  const appName = getPublicAppName();
  let categories: Awaited<ReturnType<typeof fetchPublicCategories>> = [];
  let loadError: string | null = null;
  try {
    categories = await fetchPublicCategories();
  } catch (error) {
    loadError =
      error instanceof ApiClientError ? error.message : 'Catalog is temporarily unavailable.';
  }

  const roots = categories.filter((c) => c.parentId === null).slice(0, 12);

  return (
    <div className="space-y-12">
      <section className="sf-hero" aria-labelledby="home-title">
        <div className="sf-hero-copy">
          <p className="sf-eyebrow text-white/70">A marketplace for everyday finds</p>
          <h1 id="home-title" className="sf-display">
            Find your next favourite.
          </h1>
          <p>
            Browse independent stores and published offers. Your final price and availability are
            confirmed at checkout.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/search" className="sf-button-accent">
              Explore offers
            </Link>
            <Link href="/categories" className="sf-button-secondary">
              Browse categories
            </Link>
          </div>
        </div>
        <div className="sf-hero-art" aria-label={`${appName} marketplace artwork`} />
      </section>

      <section className="space-y-5" aria-labelledby="home-categories">
        <div className="sf-section-heading">
          <div>
            <p className="sf-eyebrow">Start with a category</p>
            <h2 id="home-categories" className="mt-1">
              Shop by interest
            </h2>
          </div>
          <Link href="/categories" className="text-sm font-semibold underline underline-offset-4">
            View all
          </Link>
        </div>
        {loadError ? (
          <p className="sf-panel text-sm text-destructive" role="alert">
            {loadError}
          </p>
        ) : roots.length === 0 ? (
          <p className="sf-panel text-sm text-muted-foreground">
            Categories will appear here as stores publish their first collections.
          </p>
        ) : (
          <ul className="sf-category-grid">
            {roots.map((category) => (
              <li key={category.id}>
                <Link href={`/categories/${category.slug}`} className="sf-category-card">
                  <span className="text-lg font-semibold tracking-tight">{category.name}</span>
                  {category.seo.description ? (
                    <span className="line-clamp-2">{category.seo.description}</span>
                  ) : (
                    <span>Explore this collection →</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
