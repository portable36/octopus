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
    <div className="space-y-10">
      <section className="space-y-4">
        <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Marketplace</p>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">{appName}</h1>
        <p className="max-w-xl text-muted-foreground">
          Browse published categories and sellable offers. Checkout totals always come from the
          server.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/search"
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Search offers
          </Link>
          <Link
            href="/categories"
            className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
          >
            All categories
          </Link>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="home-categories">
        <div className="flex items-end justify-between gap-4">
          <h2 id="home-categories" className="text-xl font-semibold tracking-tight">
            Categories
          </h2>
          <Link href="/categories" className="text-sm text-muted-foreground hover:underline">
            View all
          </Link>
        </div>
        {loadError ? (
          <p className="text-sm text-destructive" role="alert">
            {loadError}
          </p>
        ) : roots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active categories yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roots.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/categories/${category.slug}`}
                  className="block border border-border p-4 hover:bg-muted/50"
                >
                  <span className="font-medium">{category.name}</span>
                  {category.seo.description ? (
                    <span className="mt-1 block text-sm text-muted-foreground line-clamp-2">
                      {category.seo.description}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
