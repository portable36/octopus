/** Build deduplicated taxonomy keywords for internal SEO logging attributes. */
export function buildTaxonomyKeywords(input: {
  readonly productName?: string | null;
  readonly categoryNames?: readonly string[];
  readonly brandName?: string | null;
  readonly extra?: readonly string[];
}): readonly string[] {
  const values = [
    input.productName,
    ...(input.categoryNames ?? []),
    input.brandName,
    ...(input.extra ?? []),
  ];

  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const value of values) {
    const normalized = normalizeKeyword(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    keywords.push(normalized);
  }

  return keywords;
}

function normalizeKeyword(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const cleaned = value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return cleaned.length > 0 ? cleaned : null;
}

export function taxonomyKeywordsContent(keywords: readonly string[]): string {
  return keywords.join(', ');
}
