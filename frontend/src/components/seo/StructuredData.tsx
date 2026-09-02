import { createElement, type ReactElement } from 'react';

type StructuredDataProps = {
  readonly data: Record<string, unknown>;
};

function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data ?? {}).replace(/</g, '\\u003c');
}

/** SSR JSON-LD injection for crawlers (Googlebot, AI agents). */
export function StructuredData({ data }: StructuredDataProps): ReactElement {
  return createElement('script', {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: serializeJsonLd(data) },
  });
}

export { serializeJsonLd };
