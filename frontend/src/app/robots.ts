import type { MetadataRoute } from 'next';
import { getPublicSiteUrl } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const site = getPublicSiteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/account',
          '/account/',
          '/cart',
          '/checkout',
          '/login',
          '/register',
          '/vendor',
          '/vendor/',
        ],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
