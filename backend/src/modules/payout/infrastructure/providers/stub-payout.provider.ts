import { Injectable } from '@nestjs/common';
import type {
  PayoutDisburseResult,
  PayoutProviderPort,
} from '../../application/ports/payout-provider.port';

/** Phase 15.2 stub — always succeeds. Replace with bank/bKash adapter later. */
@Injectable()
export class StubPayoutProviderAdapter implements PayoutProviderPort {
  public async disburse(input: {
    readonly payoutId: string;
    readonly vendorId: string;
    readonly amountMinor: number;
    readonly currencyCode: string;
  }): Promise<PayoutDisburseResult> {
    return { ok: true, providerRef: `stub:${input.payoutId}` };
  }
}
