import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import type {
  CreateCourierConsignmentInput,
  CreateCourierConsignmentResult,
  GetCourierConsignmentStatusInput,
  GetCourierConsignmentStatusResult,
} from '../../../../shared-kernel/application/ports/courier.port';
import { resolveAllowedBaseUrl } from '../../../../shared-kernel/infrastructure/security/assert-allowed-outbound-url';
import { CourierProviderError } from '../../application/errors/fulfillment.errors';
import { mapPathaoStatus, minorToMajorUnits } from '../../domain/services/courier-status.mapper';
import { CourierAccountStore, type PathaoCredentials } from '../persistence/courier-account.store';

@Injectable()
export class PathaoCourierClient {
  constructor(
    private readonly accounts: CourierAccountStore,
    private readonly config: AppConfigService,
  ) {}

  public async createConsignment(
    input: CreateCourierConsignmentInput,
  ): Promise<CreateCourierConsignmentResult> {
    const creds = await this.requireCreds(input.vendorId);
    const token = await this.getAccessToken(creds, input.vendorId);
    const amount = minorToMajorUnits(input.amountToCollectMinor, input.currencyCode);
    const body = {
      store_id: creds.pathaoStoreId,
      merchant_order_id: input.merchantOrderRef,
      recipient_name: input.recipient.name,
      recipient_phone: input.recipient.phone,
      ...(input.recipient.secondaryPhone
        ? { recipient_secondary_phone: input.recipient.secondaryPhone }
        : {}),
      recipient_address: input.recipient.address,
      delivery_type: input.deliveryType ?? 48,
      item_type: 2,
      ...(input.note ? { special_instruction: input.note } : {}),
      item_quantity: input.itemQuantity,
      item_weight: String(input.weightKg),
      item_description: input.itemSummary,
      amount_to_collect: amount,
    };
    const json = await this.authedRequest<{
      code?: number;
      message?: string;
      data?: {
        consignment_id?: string | number;
        order_status?: string;
        delivery_fee?: number;
      };
    }>(creds, token, 'POST', '/aladdin/api/v1/orders', body);

    if (!json.data?.consignment_id) {
      throw new CourierProviderError(
        json.message ?? 'Pathao create order failed.',
        'PATHAO_CREATE_FAILED',
      );
    }
    const feeMajor = json.data.delivery_fee;
    return {
      providerConsignmentId: String(json.data.consignment_id),
      trackingCode: String(json.data.consignment_id),
      providerStatus: json.data.order_status ?? 'Pending',
      ...(typeof feeMajor === 'number' ? { deliveryFeeMinor: Math.round(feeMajor * 100) } : {}),
    };
  }

  public async getStatus(
    input: GetCourierConsignmentStatusInput,
  ): Promise<GetCourierConsignmentStatusResult> {
    const creds = await this.requireCreds(input.vendorId);
    const token = await this.getAccessToken(creds, input.vendorId);
    const consignmentId = input.providerConsignmentId ?? input.trackingCode;
    if (!consignmentId) {
      throw new CourierProviderError(
        'Pathao status requires consignment id.',
        'PATHAO_STATUS_REF_MISSING',
      );
    }
    const json = await this.authedRequest<{
      data?: { order_status?: string; order_status_slug?: string };
    }>(creds, token, 'GET', `/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}/info`);
    const raw = json.data?.order_status_slug ?? json.data?.order_status ?? 'Pending';
    return {
      providerStatus: raw,
      normalizedStatus: mapPathaoStatus(raw),
      rawStatus: raw,
    };
  }

  private async requireCreds(vendorId: string): Promise<PathaoCredentials> {
    const creds = await this.accounts.getPathao(vendorId);
    if (!creds) {
      throw new CourierProviderError(
        'Pathao credentials are not configured for this vendor.',
        'PATHAO_CREDENTIALS_MISSING',
      );
    }
    return creds;
  }

  private async getAccessToken(creds: PathaoCredentials, vendorId: string): Promise<string> {
    const existing = await this.accounts.getOauthTokens(vendorId, 'PATHAO');
    const skewMs = 60_000;
    if (existing && existing.expiresAt.getTime() - skewMs > Date.now()) {
      return existing.accessToken;
    }
    if (existing?.refreshToken) {
      try {
        return await this.issueToken(creds, vendorId, {
          grant_type: 'refresh_token',
          refresh_token: existing.refreshToken,
        });
      } catch {
        // Fall through to password grant.
      }
    }
    return this.issueToken(creds, vendorId, {
      grant_type: 'password',
      username: creds.username,
      password: creds.password,
    });
  }

  private async issueToken(
    creds: PathaoCredentials,
    vendorId: string,
    grant: Record<string, string>,
  ): Promise<string> {
    const base = this.resolveBase(creds.baseUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.courierHttpTimeoutMs);
    try {
      const response = await fetch(`${base}/aladdin/api/v1/issue-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          ...grant,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new CourierProviderError(
          `Pathao token HTTP ${response.status}`,
          'PATHAO_TOKEN_ERROR',
          response.status >= 500,
        );
      }
      const json = (await response.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      };
      if (!json.access_token || !json.refresh_token || !json.expires_in) {
        throw new CourierProviderError('Pathao token response incomplete.', 'PATHAO_TOKEN_INVALID');
      }
      await this.accounts.saveOauthTokens({
        vendorId,
        provider: 'PATHAO',
        accessToken: json.access_token,
        refreshToken: json.refresh_token,
        expiresAt: new Date(Date.now() + json.expires_in * 1000),
      });
      return json.access_token;
    } finally {
      clearTimeout(timer);
    }
  }

  private async authedRequest<T>(
    creds: PathaoCredentials,
    accessToken: string,
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const base = this.resolveBase(creds.baseUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.courierHttpTimeoutMs);
    try {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new CourierProviderError(
          `Pathao HTTP ${response.status}`,
          'PATHAO_HTTP_ERROR',
          response.status >= 500,
        );
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof CourierProviderError) {
        throw error;
      }
      throw new CourierProviderError(
        error instanceof Error ? error.message : 'Pathao request failed.',
        'PATHAO_NETWORK_ERROR',
        true,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private resolveBase(candidate: string | undefined): string {
    try {
      return resolveAllowedBaseUrl(
        candidate,
        this.config.pathaoBaseUrl,
        this.config.outboundUrlAllowlistHosts,
      );
    } catch (error) {
      throw new CourierProviderError(
        error instanceof Error ? error.message : 'Pathao base URL rejected.',
        'PATHAO_BASE_URL_BLOCKED',
        false,
      );
    }
  }
}
