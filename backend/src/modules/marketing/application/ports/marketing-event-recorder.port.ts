import type { MarketingChannelStatus } from './ga4-mp.port';

export const MARKETING_EVENT_RECORDER = Symbol('MARKETING_EVENT_RECORDER');

export interface MarketingEventRecorder {
  record(input: {
    readonly eventName: string;
    readonly channel: 'ga4_mp' | 'meta_capi' | 'audit';
    readonly transactionId: string;
    readonly eventId: string;
    readonly orderId: string | null;
    readonly status: MarketingChannelStatus;
    readonly detail: string | null;
  }): Promise<void>;
}
