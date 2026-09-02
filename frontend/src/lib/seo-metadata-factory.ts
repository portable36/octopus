import type { Metadata } from 'next';
import type { SeoPageContext, SeoPageMetadata } from '@/lib/seo-discovery-api';

function robotsFromDirectives(directives: SeoPageMetadata['robotsDirectives']): Metadata['robots'] {
  const index = directives.includes('index');
  const follow = directives.includes('follow');
  return { index, follow };
}

/** Map backend seo-discovery metadata into Next.js `Metadata`. */
export function toNextMetadata(context: SeoPageContext): Metadata {
  return toNextMetadataFromPayload(context.metadata);
}

export function toNextMetadataFromPayload(metadata: SeoPageMetadata): Metadata {
  const og = metadata.openGraph;
  const ogType = og.type === 'article' ? 'article' : 'website';
  return {
    title: metadata.title,
    description: metadata.description,
    alternates: { canonical: metadata.canonicalUrl },
    openGraph: {
      title: og.title ?? metadata.title,
      description: og.description ?? metadata.description,
      url: og.url ?? metadata.canonicalUrl,
      type: ogType,
      ...(og.imageUrl ? { images: [{ url: og.imageUrl }] } : {}),
    },
    robots: robotsFromDirectives(metadata.robotsDirectives),
  };
}
