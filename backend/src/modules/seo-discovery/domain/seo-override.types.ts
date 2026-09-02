export type SeoOverrideEntityType = 'product' | 'category' | 'cms';

export interface SeoOverrideFields {
  readonly title?: string | null;
  readonly description?: string | null;
  readonly noindex?: boolean | null;
  readonly canonicalUrl?: string | null;
}
