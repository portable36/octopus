export const PAYOUT_PROVIDER = Symbol('PAYOUT_PROVIDER');

export type PayoutDisburseResult =
  | { readonly ok: true; readonly providerRef: string }
  | { readonly ok: false; readonly reason: string };

export interface PayoutProviderPort {
  disburse(input: {
    readonly payoutId: string;
    readonly vendorId: string;
    readonly amountMinor: number;
    readonly currencyCode: string;
  }): Promise<PayoutDisburseResult>;
}
