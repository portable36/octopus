import { describe, expect, it } from 'vitest';
import {
  buildStructuredData,
  findRedirectRule,
  resolveSeoMetadata,
  type RedirectRule,
  type SEOMetadata,
  type StructuredData,
} from '../index';

describe('seo-discovery scaffold', () => {
  it('imports domain types from the public facade', () => {
    const metadata: SEOMetadata = {
      title: 'Example product',
      description: 'A published offer on Octopus.',
      canonicalUrl: 'https://example.com/products/prod-1',
      openGraph: {
        title: 'Example product',
        description: 'A published offer on Octopus.',
        url: 'https://example.com/products/prod-1',
        type: 'website',
      },
      robotsDirectives: ['index', 'follow'],
    };

    const structured: StructuredData = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: metadata.title,
    };

    const redirect: RedirectRule = {
      sourceUrl: '/old-path',
      targetUrl: '/new-path',
      statusCode: 301,
    };

    expect(metadata.robotsDirectives).toEqual(['index', 'follow']);
    expect(structured['@type']).toBe('Product');
    expect(redirect.statusCode).toBe(301);
  });

  it('exposes stub boundary functions that compile and resolve', async () => {
    await expect(
      resolveSeoMetadata({ entityType: 'product', entityId: 'prod-1' }),
    ).resolves.toBeNull();
    await expect(
      buildStructuredData({ entityType: 'product', entityId: 'prod-1' }),
    ).resolves.toEqual([]);
    await expect(findRedirectRule('/missing')).resolves.toBeNull();
  });
});
