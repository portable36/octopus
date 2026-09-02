'use client';

import { useEffect } from 'react';
import { taxonomyKeywordsContent } from '@/infrastructure/analytics/taxonomy-keywords';

type Props = {
  readonly keywords: readonly string[];
};

/**
 * Injects taxonomy keyword semantics into the document for internal SEO logging
 * (meta keywords + data attribute on <html>).
 */
export function TaxonomyKeywordAttributes({ keywords }: Props) {
  useEffect(() => {
    if (keywords.length === 0) {
      return;
    }

    const content = taxonomyKeywordsContent(keywords);
    document.documentElement.setAttribute('data-taxonomy-keywords', content);

    let meta = document.querySelector('meta[name="keywords"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'keywords');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);

    return () => {
      document.documentElement.removeAttribute('data-taxonomy-keywords');
    };
  }, [keywords]);

  return null;
}
