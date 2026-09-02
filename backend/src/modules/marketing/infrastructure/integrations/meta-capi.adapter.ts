import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import { applyMetaCapiEnvToEvent } from '../../../../config/meta-capi-payload';
import {
  MARKETING_SETTINGS_PORT,
  type MarketingSettingsPort,
} from '../../../../shared-kernel/application/ports/marketing-settings.port';
import type {
  MarketingChannelResult,
  MarketingPurchasePayload,
  MarketingRefundPayload,
} from '../../application/ports/ga4-mp.port';
import type { MetaCapiPort } from '../../application/ports/meta-capi.port';

function minorToMajor(minor: number): number {
  return Math.round(minor) / 100;
}

@Injectable()
export class MetaCapiAdapter implements MetaCapiPort {
  private readonly logger = new Logger(MetaCapiAdapter.name);

  constructor(
    @Inject(MARKETING_SETTINGS_PORT) private readonly marketingSettings: MarketingSettingsPort,
    private readonly config: AppConfigService,
  ) {}

  public async sendPurchase(input: MarketingPurchasePayload): Promise<MarketingChannelResult> {
    return this.send(input, 'Purchase');
  }

  public async sendRefund(input: MarketingRefundPayload): Promise<MarketingChannelResult> {
    return this.send(input, 'Refund');
  }

  private async send(
    input: MarketingPurchasePayload | MarketingRefundPayload,
    eventName: 'Purchase' | 'Refund',
  ): Promise<MarketingChannelResult> {
    try {
      const cfg = await this.marketingSettings.getRuntime();
      if (!cfg.enabled) {
        return { status: 'SKIPPED', detail: 'marketing disabled' };
      }
      if (!cfg.metaPixelId || !cfg.metaCapiToken) {
        return { status: 'SKIPPED', detail: 'Meta CAPI not configured' };
      }

      const contentIds =
        'items' in input ? input.items.map((item) => item.itemId) : [input.transactionId];

      const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(cfg.metaPixelId)}/events`;
      const eventPayload: Record<string, unknown> = {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        custom_data: {
          currency: input.currencyCode,
          value: minorToMajor(input.valueMinor),
          content_ids: contentIds,
          content_type: 'product',
          order_id: input.transactionId,
        },
      };
      applyMetaCapiEnvToEvent(eventPayload, this.config);

      const body = {
        data: [eventPayload],
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.metaCapiToken}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return { status: 'FAILED', detail: `Meta CAPI HTTP ${response.status}` };
      }
      return { status: 'SENT', detail: null };
    } catch (error) {
      this.logger.warn(
        `Meta CAPI ${eventName} failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return {
        status: 'FAILED',
        detail: error instanceof Error ? error.message : 'Meta CAPI request failed',
      };
    }
  }
}
