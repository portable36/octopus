import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import { applyMetaCapiEnvToEvent } from '../../../../config/meta-capi-payload';
import { SystemSettingsRuntimeBridge } from '../../application/services/system-settings-runtime.bridge';
import { hashMetaEmail, hashMetaPhone } from './meta-capi-hash';
import type { MetaCapiSendInput, MetaCapiUserDataInput } from './meta-capi.types';

const META_GRAPH_API_VERSION = 'v21.0';

@Injectable()
export class MetaCapiService {
  private readonly logger = new Logger(MetaCapiService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly runtimeSettings: SystemSettingsRuntimeBridge,
  ) {}

  public async isConfigured(): Promise<boolean> {
    const env = await this.runtimeSettings.resolveMetaCapiEnv();
    return Boolean(env.metaPixelId && env.metaAccessToken);
  }

  /** Builds Meta `user_data` with SHA-256 hashed PII per Meta privacy requirements. */
  public buildHashedUserData(input: MetaCapiUserDataInput): Record<string, string> {
    const userData: Record<string, string> = {};

    if (input.email) {
      const hashed = hashMetaEmail(input.email);
      if (hashed) {
        userData.em = hashed;
      }
    }
    if (input.phone) {
      const hashed = hashMetaPhone(input.phone);
      if (hashed) {
        userData.ph = hashed;
      }
    }
    if (input.clientIpAddress?.trim()) {
      userData.client_ip_address = input.clientIpAddress.trim();
    }
    if (input.clientUserAgent?.trim()) {
      userData.client_user_agent = input.clientUserAgent.trim();
    }

    return userData;
  }

  /**
   * POST server event to Meta Graph API.
   * Throws on transport/HTTP failure so BullMQ can retry the job.
   */
  public async sendEvent(input: MetaCapiSendInput): Promise<void> {
    const runtime = await this.runtimeSettings.resolveMetaCapiEnv();
    const pixelId = runtime.metaPixelId;
    const accessToken = runtime.metaAccessToken;
    if (!pixelId || !accessToken) {
      this.logger.debug('Meta CAPI skipped — META_PIXEL_ID or META_ACCESS_TOKEN not configured.');
      return;
    }

    const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(pixelId)}/events`;
    const userData = this.buildHashedUserData(input.userData);

    const eventPayload: Record<string, unknown> = {
      event_name: input.eventName,
      event_time: input.eventTime,
      event_id: input.eventId,
      user_data: userData,
      custom_data: {
        value: input.customData.value,
        currency: input.customData.currency,
        order_id: input.customData.orderId,
      },
    };
    applyMetaCapiEnvToEvent(eventPayload, {
      metaCapiDataSource: runtime.metaCapiDataSource ?? this.config.metaCapiDataSource,
      metaAndromedaDataProcessingOptionsRaw:
        runtime.metaAndromedaDataProcessingOptionsRaw ??
        this.config.metaAndromedaDataProcessingOptionsRaw,
      metaAndromedaCountry: runtime.metaAndromedaCountry ?? this.config.metaAndromedaCountry,
      metaAndromedaState: runtime.metaAndromedaState ?? this.config.metaAndromedaState,
      gemSchemaVersion: runtime.gemSchemaVersion ?? this.config.gemSchemaVersion,
      gemTrackingEnvironment: runtime.gemTrackingEnvironment ?? this.config.gemTrackingEnvironment,
    });

    const body: Record<string, unknown> = {
      data: [eventPayload],
    };

    const testEventCode = this.config.metaTestEventCode;
    if (testEventCode) {
      body.test_event_code = testEventCode;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Meta CAPI HTTP ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      );
    }
  }
}
