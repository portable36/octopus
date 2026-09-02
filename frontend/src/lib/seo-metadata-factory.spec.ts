import { describe, expect, it } from 'vitest';
import { toNextMetadataFromPayload } from '@/lib/seo-metadata-factory';

describe('seo-metadata-factory', () => {
  it('maps backend metadata into Next.js Metadata with canonical and robots', () => {
    const metadata = toNextMetadataFromPayload({
      title: 'Wireless Mouse',
      description: 'Ergonomic mouse',
      canonicalUrl: 'https://shop.example.com/products/mouse',
      openGraph: {
        title: 'Wireless Mouse',
        description: 'Ergonomic mouse',
        url: 'https://shop.example.com/products/mouse',
        type: 'website',
        imageUrl: 'https://shop.example.com/mouse.jpg',
      },
      robotsDirectives: ['index', 'follow'],
    });

    expect(metadata.title).toBe('Wireless Mouse');
    expect(metadata.alternates?.canonical).toBe('https://shop.example.com/products/mouse');
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.openGraph?.images).toEqual([{ url: 'https://shop.example.com/mouse.jpg' }]);
  });
});
