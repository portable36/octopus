export const COURIER_PORT = Symbol('COURIER_PORT');

export type CourierProviderDto = 'STEADFAST' | 'PATHAO' | 'MANUAL';

/** Normalized shipment lifecycle shared by Fulfillment and courier adapters. */
export type NormalizedShipmentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETURNED';

export interface CourierRecipient {
  readonly name: string;
  readonly phone: string;
  readonly secondaryPhone?: string;
  readonly email?: string;
  readonly address: string;
}

export interface CreateCourierConsignmentInput {
  readonly vendorId: string;
  readonly storeId: string;
  readonly provider: CourierProviderDto;
  readonly merchantOrderRef: string;
  readonly recipient: CourierRecipient;
  /** Collectible COD in minor units; 0 for prepaid / non-COD. */
  readonly amountToCollectMinor: number;
  readonly currencyCode: string;
  readonly itemSummary: string;
  readonly itemQuantity: number;
  readonly weightKg: number;
  readonly note?: string;
  /** Pathao: 48 normal, 12 on-demand. Ignored by others. */
  readonly deliveryType?: number;
}

export interface CreateCourierConsignmentResult {
  readonly providerConsignmentId: string;
  readonly trackingCode: string | null;
  readonly providerStatus: string;
  readonly deliveryFeeMinor?: number;
}

export interface GetCourierConsignmentStatusInput {
  readonly vendorId: string;
  readonly provider: CourierProviderDto;
  readonly providerConsignmentId?: string;
  readonly trackingCode?: string;
  readonly merchantOrderRef?: string;
}

export interface GetCourierConsignmentStatusResult {
  readonly providerStatus: string;
  readonly normalizedStatus: NormalizedShipmentStatus;
  readonly rawStatus: string;
}

/** Pathao merchant price-plan; Steadfast has no public quote API. */
export interface QuoteCourierDeliveryInput {
  readonly vendorId: string;
  readonly provider: CourierProviderDto;
  readonly weightKg: number;
  /** Pathao city id from listQuoteCities. */
  readonly recipientCityId: number;
  /** Pathao zone id from listQuoteZones. */
  readonly recipientZoneId: number;
  /** Pathao: 48 normal, 12 on-demand. */
  readonly deliveryType?: number;
  /** Pathao: 1 document, 2 parcel. */
  readonly itemType?: number;
}

export interface QuoteCourierDeliveryResult {
  readonly provider: CourierProviderDto;
  readonly currencyCode: string;
  readonly priceMinor: number;
  readonly discountMinor: number;
  readonly finalPriceMinor: number;
}

export interface CourierQuoteCity {
  readonly id: number;
  readonly name: string;
}

export interface CourierQuoteZone {
  readonly id: number;
  readonly name: string;
}

export interface CourierPort {
  createConsignment(input: CreateCourierConsignmentInput): Promise<CreateCourierConsignmentResult>;
  getConsignmentStatus(
    input: GetCourierConsignmentStatusInput,
  ): Promise<GetCourierConsignmentStatusResult>;
  quoteDelivery(input: QuoteCourierDeliveryInput): Promise<QuoteCourierDeliveryResult>;
  listQuoteCities(input: {
    readonly vendorId: string;
    readonly provider: CourierProviderDto;
  }): Promise<readonly CourierQuoteCity[]>;
  listQuoteZones(input: {
    readonly vendorId: string;
    readonly provider: CourierProviderDto;
    readonly cityId: number;
  }): Promise<readonly CourierQuoteZone[]>;
}
