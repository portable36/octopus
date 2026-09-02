import type { StructuredData } from '../domain/seo.types';

export type SchemaAvailability = 'in_stock' | 'out_of_stock' | 'limited' | 'preorder';

export interface OfferInput {
  readonly priceMinor: number;
  readonly currencyCode: string;
  readonly availability: SchemaAvailability;
  readonly url: string;
  readonly sku?: string;
}

export interface ProductStructuredDataInput {
  readonly name: string;
  readonly description?: string;
  readonly sku?: string;
  readonly url: string;
  readonly imageUrl?: string;
  readonly offers: readonly OfferInput[];
}

export interface BreadcrumbItemInput {
  readonly name: string;
  readonly url: string;
}

export interface OrganizationStructuredDataInput {
  readonly name: string;
  readonly url: string;
  readonly logoUrl?: string;
}

export interface OfferStructuredData extends StructuredData {
  readonly '@type': 'Offer';
  readonly price: string;
  readonly priceCurrency: string;
  readonly availability: string;
  readonly url: string;
  readonly sku?: string;
}

export interface ProductStructuredData extends StructuredData {
  readonly '@type': 'Product';
  readonly name: string;
  readonly description?: string;
  readonly sku?: string;
  readonly image?: string;
  readonly url?: string;
  readonly offers: OfferStructuredData | OfferStructuredData[];
}

export interface BreadcrumbListStructuredData extends StructuredData {
  readonly '@type': 'BreadcrumbList';
  readonly itemListElement: readonly {
    readonly '@type': 'ListItem';
    readonly position: number;
    readonly name: string;
    readonly item: string;
  }[];
}

export interface OrganizationStructuredData extends StructuredData {
  readonly '@type': 'Organization';
  readonly name: string;
  readonly url: string;
  readonly logo?: string;
}
