'use client';

import { useEffect, useRef } from 'react';
import { trackSiteSearch } from '@/infrastructure/analytics/dataLayer';

type Props = {
  readonly query: string;
  readonly resultsCount: number;
};

/** Fires GA4 `view_search_results` when the user lands on search results. */
export function SearchResultsAnalytics({ query, resultsCount }: Props) {
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    const signature = `${trimmed}:${resultsCount}`;
    if (lastTracked.current === signature) {
      return;
    }

    lastTracked.current = signature;
    trackSiteSearch(trimmed, resultsCount);
  }, [query, resultsCount]);

  return null;
}
