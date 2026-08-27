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
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">Active category tree for browsing.</p>
      </header>
      {loadError ? (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories published.</p>
      ) : (
        <ul className="divide-y divide-border border border-border">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <Link href={`/categories/${category.slug}`} className="font-medium hover:underline">
                  {category.name}
                </Link>
                <p className="text-xs text-muted-foreground">/{category.slug}</p>
              </div>
              <Link
                href={`/search?categoryId=${encodeURIComponent(category.id)}`}
                className="text-sm text-muted-foreground hover:underline"
              >
                Offers
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
