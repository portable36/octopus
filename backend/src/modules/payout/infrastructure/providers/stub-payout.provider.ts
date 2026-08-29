import { Injectable } from '@nestjs/common';
import { withExternalSpan } from '../../../../shared-kernel/infrastructure/observability/external-span';
import type {
  PayoutDisburseResult,
  PayoutProviderPort,
} from '../../application/ports/payout-provider.port';

/** Phase 15.2 stub — fails closed until a bank/bKash adapter is configured. */
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
          ok: false,
          reason: 'PAYOUT_PROVIDER_NOT_CONFIGURED',
        };
        span.setAttribute('octopus.payout.ok', result.ok);
        return result;
      },
    );
  }
}
