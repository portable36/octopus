import { Injectable } from '@nestjs/common';
import type {
  BreadcrumbItemInput,
  BreadcrumbListStructuredData,
  OfferInput,
  OfferStructuredData,
  OrganizationStructuredData,
  OrganizationStructuredDataInput,
  ProductStructuredData,
  ProductStructuredDataInput,
  SchemaAvailability,
} from './structured-data.types';

const SCHEMA_CONTEXT = 'https://schema.org' as const;

@Injectable()
export class StructuredDataEngine {
  public buildOffer(input: OfferInput): OfferStructuredData {
    return {
      '@context': SCHEMA_CONTEXT,
      '@type': 'Offer',
      price: this.formatPriceMinor(input.priceMinor),
      priceCurrency: input.currencyCode,
      availability: this.toSchemaAvailability(input.availability),
      url: input.url,
      ...(input.sku ? { sku: input.sku } : {}),
    };
  }

  public buildProduct(input: ProductStructuredDataInput): ProductStructuredData {
    const builtOffers = input.offers.map((offer) => this.buildOffer(offer));
    const offers = this.normalizeOffers(builtOffers, input.url);

    return {
      '@context': SCHEMA_CONTEXT,
      '@type': 'Product',
      name: input.name,
      ...(input.description ? { description: input.description } : {}),
      ...(input.sku ? { sku: input.sku } : {}),
      ...(input.imageUrl ? { image: input.imageUrl } : {}),
      url: input.url,
      offers,
    };
  }

  public buildBreadcrumbList(items: readonly BreadcrumbItemInput[]): BreadcrumbListStructuredData {
    return {
      '@context': SCHEMA_CONTEXT,
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };
  }

  public buildOrganization(input: OrganizationStructuredDataInput): OrganizationStructuredData {
    return {
      '@context': SCHEMA_CONTEXT,
      '@type': 'Organization',
      name: input.name,
      url: input.url,
      ...(input.logoUrl ? { logo: input.logoUrl } : {}),
    };
  }

  private normalizeOffers(
    offers: readonly OfferStructuredData[],
    fallbackUrl: string,
  ): OfferStructuredData | OfferStructuredData[] {
    if (offers.length === 1) {
      return offers[0]!;
    }
    if (offers.length > 1) {
      return [...offers];
    }
    return {
      '@context': SCHEMA_CONTEXT,
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      availability: `${SCHEMA_CONTEXT}/OutOfStock`,
      url: fallbackUrl,
    };
  }

  private formatPriceMinor(priceMinor: number): string {
    const major = priceMinor / 100;
    return major.toFixed(2);
  }

  private toSchemaAvailability(availability: SchemaAvailability): string {
    const map: Record<SchemaAvailability, string> = {
      in_stock: `${SCHEMA_CONTEXT}/InStock`,
      out_of_stock: `${SCHEMA_CONTEXT}/OutOfStock`,
      limited: `${SCHEMA_CONTEXT}/LimitedAvailability`,
      preorder: `${SCHEMA_CONTEXT}/PreOrder`,
    };
    return map[availability];
  }
}
