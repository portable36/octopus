export const CATALOG_SEO_FACTS = Symbol('CATALOG_SEO_FACTS');

export type ProductSeoFacts = {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly sku: string;
  readonly imageUrl: string | null;
  readonly offers: readonly {
    readonly sku: string;
    readonly priceMinor: number;
    readonly currencyCode: string;
    readonly isAvailable: boolean;
  }[];
};

export type CategorySeoFacts = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
};

export interface CatalogSeoFactsPort {
  findProductById(productId: string): Promise<ProductSeoFacts | null>;
  findCategoryBySlug(slug: string): Promise<CategorySeoFacts | null>;
  cmsTitleFromSlug(slug: string): string;
  siteUrl(): string;
}
