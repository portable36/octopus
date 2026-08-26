export const GA4_MP_PORT = Symbol('GA4_MP_PORT');

export type MarketingChannelStatus = 'SENT' | 'SKIPPED' | 'FAILED';

export type MarketingChannelResult = {
  readonly status: MarketingChannelStatus;
  readonly detail: string | null;
};

export type MarketingPurchasePayload = {
  readonly eventId: string;
  readonly transactionId: string;
  readonly orderId: string;
  readonly currencyCode: string;
  readonly valueMinor: number;
  readonly items: readonly {
    readonly itemId: string;
    readonly quantity: number;
    readonly priceMinor: number;
  }[];
};

export type MarketingRefundPayload = {
  readonly eventId: string;
  readonly transactionId: string;
  readonly orderId: string;
  readonly currencyCode: string;
  readonly valueMinor: number;
};

export interface Ga4MpPort {
  sendPurchase(input: MarketingPurchasePayload): Promise<MarketingChannelResult>;
  sendRefund(input: MarketingRefundPayload): Promise<MarketingChannelResult>;
}
