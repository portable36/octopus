import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MARKETING_SETTINGS_PORT,
  type MarketingSettingsPort,
} from '../../../../shared-kernel/application/ports/marketing-settings.port';
import type {
  Ga4MpPort,
  MarketingChannelResult,
  MarketingPurchasePayload,
  MarketingRefundPayload,
} from '../../application/ports/ga4-mp.port';

function minorToMajor(minor: number): number {
  return Math.round(minor) / 100;
}

@Injectable()
export class Ga4MpAdapter implements Ga4MpPort {
  private readonly logger = new Logger(Ga4MpAdapter.name);

  constructor(
    @Inject(MARKETING_SETTINGS_PORT) private readonly marketingSettings: MarketingSettingsPort,
  ) {}

  public async sendPurchase(input: MarketingPurchasePayload): Promise<MarketingChannelResult> {
    return this.send(input, 'purchase');
  }

  public async sendRefund(input: MarketingRefundPayload): Promise<MarketingChannelResult> {
    return this.send(input, 'refund');
  }

  private async send(
    input: MarketingPurchasePayload | MarketingRefundPayload,
    eventName: 'purchase' | 'refund',
  ): Promise<MarketingChannelResult> {
    try {
      const cfg = await this.marketingSettings.getRuntime();
      if (!cfg.enabled) {
        return { status: 'SKIPPED', detail: 'marketing disabled' };
      }
      if (!cfg.ga4MeasurementId || !cfg.ga4MpApiSecret) {
        return { status: 'SKIPPED', detail: 'GA4 MP not configured' };
      }

      const url = new URL('https://www.google-analytics.com/mp/collect');
      url.searchParams.set('measurement_id', cfg.ga4MeasurementId);
      url.searchParams.set('api_secret', cfg.ga4MpApiSecret);

      const body: Record<string, unknown> = {
        client_id: input.orderId,
        events: [
          {
            name: eventName,
            params: {
              transaction_id: input.transactionId,
              currency: input.currencyCode,
              value: minorToMajor(input.valueMinor),
              engagement_time_msec: 1,
              ...('items' in input
                ? {
                    items: input.items.map((item) => ({
                      item_id: item.itemId,
                      quantity: item.quantity,
                      price: minorToMajor(item.priceMinor),
                    })),
                  }
                : {}),
            },
          },
        ],
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return { status: 'FAILED', detail: `GA4 MP HTTP ${response.status}` };
      }
      return { status: 'SENT', detail: null };
    } catch (error) {
      this.logger.warn(
        `GA4 MP ${eventName} failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return {
        status: 'FAILED',
        detail: error instanceof Error ? error.message : 'GA4 MP request failed',
      };
    }
  }
}
