import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';
import { fetchPublicCategories, fetchSitemapProducts } from '@/lib/storefront-api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/categories'), changeFrequency: 'daily', priority: 0.8 },
  ];

  try {
    const categories = await fetchPublicCategories();
    for (const category of categories) {
      entries.push({
        url: absoluteUrl(`/categories/${category.slug}`),
        changeFrequency: 'daily',
        priority: 0.7,
      });
    }
  } catch {
    // API down — still emit static shell URLs
  }

  try {
    const products = await fetchSitemapProducts();
    for (const product of products) {
      entries.push({
        url: absoluteUrl(`/products/${product.id}`),
        lastModified: product.updatedAt,
        changeFrequency: 'daily',
        priority: 0.6,
      });
    }
  } catch {
    // omit product URLs when catalog unreachable
  }

  return entries;
}
