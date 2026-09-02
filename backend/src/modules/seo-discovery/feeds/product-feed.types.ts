export type ProductFeedAvailability = 'in_stock' | 'out_of_stock';

export interface ProductFeedItem {
  readonly productId: string;
  readonly variantId: string;
  readonly sku: string;
  readonly title: string;
  readonly description: string;
  readonly link: string;
  readonly priceMinor: number;
  readonly currencyCode: string;
  readonly availability: ProductFeedAvailability;
  readonly condition: 'new';
}

export type ProductFeedFormat = 'google-xml' | 'meta-json';
