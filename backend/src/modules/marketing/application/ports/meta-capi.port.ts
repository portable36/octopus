import type {
  MarketingChannelResult,
  MarketingPurchasePayload,
  MarketingRefundPayload,
} from './ga4-mp.port';

export const META_CAPI_PORT = Symbol('META_CAPI_PORT');

export interface MetaCapiPort {
  sendPurchase(input: MarketingPurchasePayload): Promise<MarketingChannelResult>;
  sendRefund(input: MarketingRefundPayload): Promise<MarketingChannelResult>;
}
