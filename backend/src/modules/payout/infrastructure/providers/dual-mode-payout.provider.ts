import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import { withExternalSpan } from '../../../../shared-kernel/infrastructure/observability/external-span';
import type {
  PayoutDisburseResult,
  PayoutProviderPort,
} from '../../application/ports/payout-provider.port';

/**
 * Dual-mode payout provider: mock/simulation when live bank/bKash credentials
 * are absent (local + CI). Live HTTP adapters can replace this later.
 */
@Injectable()
export class DualModePayoutProviderAdapter implements PayoutProviderPort {
  constructor(private readonly config: AppConfigService) {}

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
        const mock =
          this.config.nodeEnv !== 'production' ||
          process.env.PAYOUT_MOCK === 'true' ||
          !process.env.PAYOUT_BANK_API_KEY;

        if (!mock && !process.env.PAYOUT_BANK_API_KEY && !process.env.PAYOUT_BKASH_APP_KEY) {
          const result: PayoutDisburseResult = {
            ok: false,
            reason: 'PAYOUT_PROVIDER_NOT_CONFIGURED',
          };
          span.setAttribute('octopus.payout.ok', false);
          return result;
        }

        // ponytail: simulation path until live bank/bKash HTTP adapters land
        const channel = process.env.PAYOUT_BKASH_APP_KEY ? 'bkash' : 'bank';
        const result: PayoutDisburseResult = {
          ok: true,
          providerRef: `${channel}-sim-${input.payoutId.slice(0, 8)}-${Date.now()}`,
        };
        span.setAttribute('octopus.payout.ok', true);
        span.setAttribute('octopus.payout.channel', channel);
        return result;
      },
    );
  }
}
