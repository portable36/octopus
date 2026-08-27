import { Injectable } from '@nestjs/common';
import { withExternalSpan } from '../../../../shared-kernel/infrastructure/observability/external-span';
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
    return withExternalSpan(
      'payout.provider.disburse',
      {
        'octopus.payout.id': input.payoutId,
        'octopus.payout.vendor_id': input.vendorId,
        'octopus.payout.currency': input.currencyCode,
      },
      async (span) => {
        const result: PayoutDisburseResult = {
          ok: true,
          providerRef: `stub:${input.payoutId}`,
        };
        span.setAttribute('octopus.payout.ok', result.ok);
        return result;
      },
    );
  }
}
