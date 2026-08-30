import Link from 'next/link';
import type { Metadata } from 'next';
import { ApiClientError } from '@/lib/api-client';
import { absoluteUrl } from '@/lib/seo';
import { fetchPublicCategories } from '@/lib/storefront-api';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Browse active categories',
  alternates: { canonical: absoluteUrl('/categories') },
};

export default async function CategoriesPage() {
  let categories: Awaited<ReturnType<typeof fetchPublicCategories>> = [];
  let loadError: string | null = null;
  try {
    categories = await fetchPublicCategories();
  } catch (error) {
    loadError = error instanceof ApiClientError ? error.message : 'Failed to load categories.';
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="sf-eyebrow">Find your lane</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Categories</h1>
        <p className="max-w-xl text-muted-foreground">
          Explore collections from independent stores across the marketplace.
        </p>
      </header>
      {loadError ? (
        <p className="sf-panel text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : categories.length === 0 ? (
        <p className="sf-panel text-sm text-muted-foreground">
          No categories are published yet. Check back soon for new collections.
        </p>
      ) : (
        <ul className="sf-category-grid">
          {categories.map((category) => (
            <li key={category.id}>
              <Link href={`/categories/${category.slug}`} className="sf-category-card">
                <span className="text-lg font-semibold tracking-tight">{category.name}</span>
                <span>
                  View offers <span aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
