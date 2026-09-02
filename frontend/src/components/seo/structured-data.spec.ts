import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StructuredData, serializeJsonLd } from './StructuredData';

function parseJsonLdFromMarkup(markup: string): unknown {
  const match = /<script[^>]*>([\s\S]*?)<\/script>/.exec(markup);
  if (!match?.[1]) {
    throw new Error('JSON-LD script tag not found');
  }
  return JSON.parse(match[1]) as unknown;
}

describe('StructuredData', () => {
  it('renders valid stringified JSON-LD syntax', () => {
    const markup = renderToStaticMarkup(
      createElement(StructuredData, {
        data: {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: 'Wireless Mouse',
        },
      }),
    );

    expect(markup).toContain('type="application/ld+json"');
    const parsed = parseJsonLdFromMarkup(markup) as Record<string, unknown>;
    expect(parsed['@type']).toBe('Product');
    expect(parsed.name).toBe('Wireless Mouse');
  });

  it('does not throw when optional properties are missing', () => {
    expect(() => {
      const markup = renderToStaticMarkup(createElement(StructuredData, { data: {} }));
      const parsed = parseJsonLdFromMarkup(markup);
      expect(parsed).toEqual({});
    }).not.toThrow();
  });

  it('escapes angle brackets in serialized output', () => {
    const json = serializeJsonLd({ note: '</script>' });
    expect(json).not.toContain('</script>');
    expect(json).toContain('\\u003c');
  });
});
