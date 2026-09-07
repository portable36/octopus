import Link from 'next/link';
import type { Metadata } from 'next';
import { ApiClientError } from '@/lib/api-client';
import { OfferCard } from '@/components/storefront/offer-card';
import { getPublicAppName } from '@/lib/env';
import { absoluteUrl } from '@/lib/seo';
import { fetchPublicCategories, searchProducts } from '@/lib/storefront-api';
import { DEFAULT_THEME_SETTINGS, fetchStorefrontConfig } from '@/lib/storefront-config-api';

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
  let theme = DEFAULT_THEME_SETTINGS;
  let categoryError: string | null = null;
  let offerError: string | null = null;

  const [categoriesResult, offersResult, configResult] = await Promise.allSettled([
    fetchPublicCategories(),
    searchProducts({ sort: 'newest', limit: 8 }),
    fetchStorefrontConfig(),
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

  if (configResult.status === 'fulfilled' && configResult.value.theme) {
    theme = configResult.value.theme;
  }

  const roots = categories.filter((c) => c.parentId === null).slice(0, 12);

  return (
    <div className="space-y-12">
      {theme.heroBanner.enabled ? (
        <section className="sf-hero" aria-labelledby="home-title">
          <div className="sf-hero-copy">
            <p className="sf-eyebrow text-white/70">
              {theme.heroBanner.badgeText || 'A marketplace for everyday finds'}
            </p>
            <h1 id="home-title" className="sf-display">
              {theme.heroBanner.title || 'Good finds. Close to home.'}
            </h1>
            <p>
              {theme.heroBanner.subtitle ||
                'Browse independent stores and published offers. Your final price and availability are confirmed at checkout.'}
            </p>
            <div className="flex flex-wrap gap-3">
              {theme.heroBanner.ctaText && theme.heroBanner.ctaUrl ? (
                <Link href={theme.heroBanner.ctaUrl} className="sf-button-accent">
                  {theme.heroBanner.ctaText}
                </Link>
              ) : (
                <Link href="/search" className="sf-button-accent">
                  Explore offers
                </Link>
              )}
              <Link href="/categories" className="sf-button-secondary">
                Browse categories
              </Link>
            </div>
          </div>
          {theme.heroBanner.imageUrl ? (
            <div
              className="sf-hero-art"
              style={{
                backgroundImage: `url(${theme.heroBanner.imageUrl})`,
                backgroundSize: 'cover',
              }}
              aria-label={`${appName} marketplace hero artwork`}
            />
          ) : (
            <div className="sf-hero-art" aria-label={`${appName} marketplace artwork`} />
          )}
        </section>
      ) : null}

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

      {theme.promoBanner?.enabled ? (
        <section
          className="rounded-2xl border border-border bg-gradient-to-r from-muted/80 via-muted/40 to-background p-8 md:p-10 shadow-sm"
          aria-label="Promotional banner slot"
        >
          <div className="max-w-2xl space-y-3">
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              Featured Notice
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {theme.promoBanner.title}
            </h2>
            <p className="text-sm text-muted-foreground md:text-base leading-relaxed">
              {theme.promoBanner.text}
            </p>
            {theme.promoBanner.ctaText && theme.promoBanner.ctaUrl ? (
              <div className="pt-2">
                <Link href={theme.promoBanner.ctaUrl} className="sf-button-accent">
                  {theme.promoBanner.ctaText}
                </Link>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

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
