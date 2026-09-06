import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import {
  PAYMENT_PORT,
  type PaymentPort,
} from '../../../../shared-kernel/application/ports/payment.port';
import { verifyHmacSha256Hex } from '../../../../shared-kernel/infrastructure/security/webhook-signature';
import { InvalidShipmentTransitionError } from '../../domain/errors/fulfillment.errors';
import type { CourierProvider, ShipmentStatus } from '../../domain/fulfillment.types';
import { mapPathaoStatus, mapSteadfastStatus } from '../../domain/services/courier-status.mapper';
import { FulfillmentAccessDeniedError } from '../errors/fulfillment.errors';
import {
  FULFILLMENT_REPOSITORY,
  type FulfillmentRepository,
} from '../ports/fulfillment-repository.interface';

export interface ProcessCourierWebhookInput {
  readonly provider: CourierProvider;
  readonly payload: Record<string, unknown>;
  readonly rawBodyString?: string;
  readonly signatureOrToken?: string;
}

export interface ProcessCourierWebhookResult {
  readonly received: true;
  readonly matched: boolean;
  readonly updated: boolean;
  readonly shipmentId?: string;
  readonly normalizedStatus?: ShipmentStatus;
  readonly message?: string;
}

@Injectable()
export class ProcessCourierWebhookHandler {
  private readonly logger = new Logger(ProcessCourierWebhookHandler.name);

  constructor(
    @Inject(FULFILLMENT_REPOSITORY) private readonly shipments: FulfillmentRepository,
    @Inject(PAYMENT_PORT) private readonly payments: PaymentPort,
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  public async execute(input: ProcessCourierWebhookInput): Promise<ProcessCourierWebhookResult> {
    this.verifySecretOrSignature(input);

    const { references, rawStatus } = this.extractReferencesAndStatus(
      input.provider,
      input.payload,
    );

    if (references.length === 0) {
      return {
        received: true,
        matched: false,
        updated: false,
        message: 'No shipment identifier found in webhook payload.',
      };
    }

    if (!rawStatus) {
      return {
        received: true,
        matched: false,
        updated: false,
        message: 'No status found in webhook payload.',
      };
    }

    let shipment = null;
    let matchedRef = '';
    for (const ref of references) {
      shipment = await this.shipments.findByProviderReference(input.provider, ref);
      if (shipment) {
        matchedRef = ref;
        break;
      }
    }

    if (!shipment) {
      this.logger.warn(
        `Webhook for ${input.provider} with references [${references.join(', ')}] matched no shipment.`,
      );
      return {
        received: true,
        matched: false,
        updated: false,
        message: `No shipment matched for references: ${references.join(', ')}`,
      };
    }

    const normalized =
      input.provider === 'STEADFAST' ? mapSteadfastStatus(rawStatus) : mapPathaoStatus(rawStatus);

    if (shipment.status === normalized) {
      shipment.applyProviderStatus(normalized, rawStatus);
      await this.shipments.save(shipment, `webhook:${input.provider}:${matchedRef}:${Date.now()}`);
      return {
        received: true,
        matched: true,
        updated: false,
        shipmentId: shipment.id.value,
        normalizedStatus: shipment.status,
      };
    }

    try {
      const becameDelivered = normalized === 'DELIVERED' && shipment.status !== 'DELIVERED';
      shipment.applyProviderStatus(normalized, rawStatus);
      await this.shipments.save(shipment, `webhook:${input.provider}:${matchedRef}:${Date.now()}`);

      if (becameDelivered && shipment.amountToCollectMinor > 0) {
        const intent = await this.payments.findCodIntentByOrderId(shipment.orderId);
        if (intent && intent.status === 'AWAITING_COLLECTION') {
          await this.payments.confirmCodCollectionFromFulfillment({
            paymentIntentId: intent.paymentIntentId,
            amountMinor: intent.amountMinor,
            currencyCode: intent.currencyCode,
            idempotencyKey: `cod-webhook:${shipment.id.value}:${matchedRef}`,
            actorUserId: 'system:courier-webhook',
            note: `Auto-collected via courier webhook delivery confirmation (${input.provider})`,
          });
        }
      }

      this.logger.log(
        `Shipment ${shipment.id.value} transitioned to ${normalized} via ${input.provider} webhook (ref: ${matchedRef}).`,
      );

      return {
        received: true,
        matched: true,
        updated: true,
        shipmentId: shipment.id.value,
        normalizedStatus: shipment.status,
      };
    } catch (error) {
      if (error instanceof InvalidShipmentTransitionError) {
        this.logger.warn(
          `Ignored invalid shipment transition for ${shipment.id.value}: ${error.message}`,
        );
        return {
          received: true,
          matched: true,
          updated: false,
          shipmentId: shipment.id.value,
          normalizedStatus: shipment.status,
          message: error.message,
        };
      }
      throw error;
    }
  }

  private verifySecretOrSignature(input: ProcessCourierWebhookInput): void {
    const secret =
      input.provider === 'STEADFAST'
        ? this.config.steadfastWebhookSecret
        : this.config.pathaoWebhookSecret;

    if (!secret) {
      return;
    }

    const provided = (input.signatureOrToken || '').trim();
    if (!provided) {
      throw new FulfillmentAccessDeniedError('Missing courier webhook signature/token.');
    }

    if (provided === secret) {
      return;
    }

    if (input.rawBodyString) {
      const isValidHmac = verifyHmacSha256Hex(input.rawBodyString, secret, provided);
      if (isValidHmac) {
        return;
      }
    }

    throw new FulfillmentAccessDeniedError('Invalid courier webhook signature/token.');
  }

  private extractReferencesAndStatus(
    provider: CourierProvider,
    payload: Record<string, unknown>,
  ): { readonly references: readonly string[]; readonly rawStatus?: string | undefined } {
    const references: string[] = [];
    let rawStatus: string | undefined;

    if (provider === 'STEADFAST') {
      const consignmentId = payload.consignment_id ?? payload.consignmentId;
      if (consignmentId !== undefined && consignmentId !== null) {
        references.push(String(consignmentId).trim());
      }
      const trackingCode = payload.tracking_code ?? payload.trackingCode;
      if (typeof trackingCode === 'string' && trackingCode.trim()) {
        references.push(trackingCode.trim());
      }
      const invoice = payload.invoice ?? payload.merchant_order_ref;
      if (typeof invoice === 'string' && invoice.trim()) {
        references.push(invoice.trim());
      }
      const status = payload.status ?? payload.delivery_status ?? payload.order_status;
      if (typeof status === 'string') {
        rawStatus = status.trim();
      }
    } else if (provider === 'PATHAO') {
      const data =
        payload.data && typeof payload.data === 'object'
          ? (payload.data as Record<string, unknown>)
          : payload;

      const consignmentId = data.consignment_id ?? data.consignmentId;
      if (consignmentId !== undefined && consignmentId !== null) {
        references.push(String(consignmentId).trim());
      }
      const merchantOrderId = data.merchant_order_id ?? data.merchantOrderId;
      if (typeof merchantOrderId === 'string' && merchantOrderId.trim()) {
        references.push(merchantOrderId.trim());
      }
      const trackingCode = data.tracking_code ?? data.trackingCode;
      if (typeof trackingCode === 'string' && trackingCode.trim()) {
        references.push(trackingCode.trim());
      }
      const status = data.order_status ?? data.orderStatus ?? data.status ?? payload.event;
      if (typeof status === 'string') {
        rawStatus = status.trim();
      }
    }

    return {
      references: Array.from(new Set(references.filter(Boolean))),
      rawStatus,
    };
  }
}
