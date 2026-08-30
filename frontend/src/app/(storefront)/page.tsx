import Link from 'next/link';
import type { Metadata } from 'next';
import { ApiClientError } from '@/lib/api-client';
import { OfferCard } from '@/components/storefront/offer-card';
import { getPublicAppName } from '@/lib/env';
import { absoluteUrl } from '@/lib/seo';
import { fetchPublicCategories, searchProducts } from '@/lib/storefront-api';

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
  let offers: Awaited<ReturnType<typeof searchProducts>>['hits'] = [];
  let categoryError: string | null = null;
  let offerError: string | null = null;
  const [categoriesResult, offersResult] = await Promise.allSettled([
    fetchPublicCategories(),
    searchProducts({ sort: 'newest', limit: 8 }),
  ]);
  if (categoriesResult.status === 'fulfilled') {
    categories = categoriesResult.value;
  } else {
    categoryError =
      categoriesResult.reason instanceof ApiClientError
        ? categoriesResult.reason.message
        : 'Categories are temporarily unavailable.';
  }
  if (offersResult.status === 'fulfilled') {
    offers = offersResult.value.hits;
  } else {
    offerError =
      offersResult.reason instanceof ApiClientError
        ? offersResult.reason.message
        : 'Latest offers are temporarily unavailable.';
  }

  const roots = categories.filter((c) => c.parentId === null).slice(0, 12);

  return (
    <div className="space-y-12">
      <section className="sf-hero" aria-labelledby="home-title">
        <div className="sf-hero-copy">
          <p className="sf-eyebrow text-white/70">A marketplace for everyday finds</p>
          <h1 id="home-title" className="sf-display">
            Good finds. Close to home.
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

      <section className="sf-trust-grid" aria-label="Shopping benefits">
        <div>
          <span className="sf-trust-mark" aria-hidden="true">
            01
          </span>
          <h2>Delivery across Bangladesh</h2>
          <p>Shop from stores publishing offers in your area.</p>
        </div>
        <div>
          <span className="sf-trust-mark" aria-hidden="true">
            02
          </span>
          <h2>Clear prices</h2>
          <p>Checkout confirms the price, stock, and eligible delivery.</p>
        </div>
        <div>
          <span className="sf-trust-mark" aria-hidden="true">
            03
          </span>
          <h2>Cash on delivery</h2>
          <p>Available when the store and order meet the requirements.</p>
        </div>
        <div>
          <span className="sf-trust-mark" aria-hidden="true">
            04
          </span>
          <h2>Independent stores</h2>
          <p>Discover products from sellers in one marketplace.</p>
        </div>
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
        {categoryError ? (
          <p className="sf-panel text-sm text-destructive" role="alert">
            {categoryError}
          </p>
        ) : roots.length === 0 ? (
          <p className="sf-panel text-sm text-muted-foreground">
            Categories will appear here as stores publish their first collections.
          </p>
        ) : (
          <ul className="sf-category-rail">
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

      <section className="space-y-5" aria-labelledby="latest-offers">
        <div className="sf-section-heading">
          <div>
            <p className="sf-eyebrow">Fresh from the marketplace</p>
            <h2 id="latest-offers" className="mt-1">
              Latest offers
            </h2>
          </div>
          <Link
            href="/search?sort=newest"
            className="text-sm font-semibold underline underline-offset-4"
          >
            See all
          </Link>
        </div>
        {offerError ? (
          <p className="sf-panel text-sm text-destructive" role="alert">
            {offerError}
          </p>
        ) : offers.length === 0 ? (
          <p className="sf-panel text-sm text-muted-foreground">
            New offers will appear here as stores publish their collections.
          </p>
        ) : (
          <div className="sf-results-grid">
            {offers.map((offer) => (
              <OfferCard key={offer.id} hit={offer} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
