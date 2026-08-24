import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import type {
  CreateCourierConsignmentInput,
  CreateCourierConsignmentResult,
  GetCourierConsignmentStatusInput,
  GetCourierConsignmentStatusResult,
} from '../../../../shared-kernel/application/ports/courier.port';
import { CourierProviderError } from '../../application/errors/fulfillment.errors';
import { mapSteadfastStatus, minorToMajorUnits } from '../../domain/services/courier-status.mapper';
import {
  CourierAccountStore,
  type SteadfastCredentials,
} from '../persistence/courier-account.store';

@Injectable()
export class SteadfastCourierClient {
  constructor(
    private readonly accounts: CourierAccountStore,
    private readonly config: AppConfigService,
  ) {}

  public async createConsignment(
    input: CreateCourierConsignmentInput,
  ): Promise<CreateCourierConsignmentResult> {
    const creds = await this.requireCreds(input.vendorId);
    const codAmount = minorToMajorUnits(input.amountToCollectMinor, input.currencyCode);
    const body = {
      invoice: input.merchantOrderRef,
      recipient_name: input.recipient.name,
      recipient_phone: input.recipient.phone,
      ...(input.recipient.secondaryPhone
        ? { alternative_phone: input.recipient.secondaryPhone }
        : {}),
      ...(input.recipient.email ? { recipient_email: input.recipient.email } : {}),
      recipient_address: input.recipient.address,
      cod_amount: codAmount,
      ...(input.note ? { note: input.note } : {}),
      item_description: input.itemSummary,
      total_lot: input.itemQuantity,
      delivery_type: 0,
    };
    const json = await this.request<{
      status?: number;
      message?: string;
      consignment?: {
        consignment_id: number | string;
        tracking_code?: string;
        status?: string;
      };
    }>(creds, 'POST', '/create_order', body);

    const consignment = json.consignment;
    if (!consignment?.consignment_id) {
      throw new CourierProviderError(
        json.message ?? 'Steadfast create_order failed.',
        'STEADFAST_CREATE_FAILED',
      );
    }
    return {
      providerConsignmentId: String(consignment.consignment_id),
      trackingCode: consignment.tracking_code ?? null,
      providerStatus: consignment.status ?? 'in_review',
    };
  }

  public async getStatus(
    input: GetCourierConsignmentStatusInput,
  ): Promise<GetCourierConsignmentStatusResult> {
    const creds = await this.requireCreds(input.vendorId);
    let path: string | null = null;
    if (input.providerConsignmentId) {
      path = `/status_by_cid/${encodeURIComponent(input.providerConsignmentId)}`;
    } else if (input.merchantOrderRef) {
      path = `/status_by_invoice/${encodeURIComponent(input.merchantOrderRef)}`;
    } else if (input.trackingCode) {
      path = `/status_by_trackingcode/${encodeURIComponent(input.trackingCode)}`;
    }
    if (!path) {
      throw new CourierProviderError(
        'Steadfast status requires consignment id, invoice, or tracking code.',
        'STEADFAST_STATUS_REF_MISSING',
      );
    }
    const json = await this.request<{ delivery_status?: string; status?: number }>(
      creds,
      'GET',
      path,
    );
    const raw = json.delivery_status ?? 'unknown';
    return {
      providerStatus: raw,
      normalizedStatus: mapSteadfastStatus(raw),
      rawStatus: raw,
    };
  }

  private async requireCreds(vendorId: string): Promise<SteadfastCredentials> {
    const creds = await this.accounts.getSteadfast(vendorId);
    if (!creds) {
      throw new CourierProviderError(
        'Steadfast credentials are not configured for this vendor.',
        'STEADFAST_CREDENTIALS_MISSING',
      );
    }
    return creds;
  }

  private async request<T>(
    creds: SteadfastCredentials,
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const base = (creds.baseUrl ?? this.config.steadfastBaseUrl).replace(/\/$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.courierHttpTimeoutMs);
    try {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: {
          'Api-Key': creds.apiKey,
          'Secret-Key': creds.secretKey,
          'Content-Type': 'application/json',
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new CourierProviderError(
          `Steadfast HTTP ${response.status}`,
          'STEADFAST_HTTP_ERROR',
          response.status >= 500,
        );
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof CourierProviderError) {
        throw error;
      }
      throw new CourierProviderError(
        error instanceof Error ? error.message : 'Steadfast request failed.',
        'STEADFAST_NETWORK_ERROR',
        true,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
