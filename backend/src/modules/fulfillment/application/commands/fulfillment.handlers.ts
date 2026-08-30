import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  COURIER_PORT,
  type CourierPort,
  type CourierProviderDto,
} from '../../../../shared-kernel/application/ports/courier.port';
import { ORDER_PORT, type OrderPort } from '../../../../shared-kernel/application/ports/order.port';
import {
  PAYMENT_PORT,
  type PaymentPort,
} from '../../../../shared-kernel/application/ports/payment.port';
import { Shipment } from '../../domain/aggregates/shipment.aggregate';
import type { CourierProvider, ShipmentStatus } from '../../domain/fulfillment.types';
import {
  CourierProviderError,
  FulfillmentIdempotencyConflictError,
  FulfillmentValidationError,
  ShipmentNotFoundError,
} from '../errors/fulfillment.errors';
import {
  FULFILLMENT_REPOSITORY,
  type FulfillmentRepository,
} from '../ports/fulfillment-repository.interface';
import { FulfillmentAuthorizationService } from '../services/fulfillment-authorization.service';

export interface CreateShipmentCommand {
  readonly orderId: string;
  readonly provider: CourierProviderDto;
  readonly lines: readonly { readonly lineId: string; readonly quantity: number }[];
  readonly recipientName: string;
  readonly recipientPhone: string;
  readonly recipientSecondaryPhone?: string;
  readonly recipientAddress?: string;
  readonly weightKg?: number;
  readonly note?: string;
  readonly idempotencyKey: string;
  readonly actorUserId: string;
  readonly actorRoles: readonly string[];
  readonly deliveryType?: number;
}

export interface ShipmentResponse {
  readonly shipmentId: string;
  readonly orderId: string;
  readonly provider: CourierProvider;
  readonly status: ShipmentStatus;
  readonly providerConsignmentId: string | null;
  readonly trackingCode: string | null;
  readonly amountToCollectMinor: number;
  readonly currencyCode: string;
}

@Injectable()
export class CreateShipmentHandler {
  constructor(
    @Inject(FULFILLMENT_REPOSITORY) private readonly shipments: FulfillmentRepository,
    @Inject(ORDER_PORT) private readonly orders: OrderPort,
    @Inject(PAYMENT_PORT) private readonly payments: PaymentPort,
    @Inject(COURIER_PORT) private readonly courier: CourierPort,
    @Inject(FulfillmentAuthorizationService)
    private readonly authz: FulfillmentAuthorizationService,
  ) {}

  public async execute(input: CreateShipmentCommand): Promise<ShipmentResponse> {
    const requestHash = hashCreate(input);
    const prior = await this.shipments.findOperation(input.idempotencyKey);
    if (prior) {
      if (prior.requestHash !== requestHash) {
        throw new FulfillmentIdempotencyConflictError();
      }
      return prior.responseJson as unknown as ShipmentResponse;
    }

    const existing = await this.shipments.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return toResponse(existing);
    }

    const order = await this.orders.prepareShipment({
      orderId: input.orderId,
      actorUserId: input.actorUserId,
      actorRoles: input.actorRoles,
      lines: input.lines,
    });

    await this.authz.requireFulfiller(
      { storeId: order.storeId, vendorId: order.vendorId },
      input.actorUserId,
      input.actorRoles,
    );

    let amountToCollectMinor = 0;
    if (order.paymentMethod === 'COD') {
      const intent = await this.payments.findCodIntentByOrderId(order.orderId);
      if (!intent || intent.status !== 'AWAITING_COLLECTION') {
        throw new FulfillmentValidationError(
          'COD payment intent is not awaiting collection for this order.',
        );
      }
      amountToCollectMinor = intent.amountMinor;
    }

    const address =
      input.recipientAddress?.trim() ||
      [
        order.shippingAddress.line1,
        order.shippingAddress.line2,
        order.shippingAddress.city,
        order.shippingAddress.region,
        order.shippingAddress.postalCode,
        order.shippingAddress.countryCode,
      ]
        .filter(Boolean)
        .join(', ');

    const shipment = Shipment.create({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      vendorId: order.vendorId,
      storeId: order.storeId,
      provider: input.provider,
      lines: input.lines.map((l) => ({ orderLineId: l.lineId, quantity: l.quantity })),
      recipient: {
        name: input.recipientName,
        phone: input.recipientPhone,
        secondaryPhone: input.recipientSecondaryPhone ?? null,
        address,
      },
      amountToCollectMinor,
      currencyCode: order.currencyCode,
      merchantOrderRef: `${order.orderNumber}-${input.idempotencyKey.slice(0, 12)}`,
      itemSummary: input.lines.map((l) => l.lineId).join(', '),
      weightKg: input.weightKg ?? 0.5,
      note: input.note ?? null,
    });

    await this.shipments.save(shipment, input.idempotencyKey);

    try {
      const created = await this.courier.createConsignment({
        vendorId: shipment.vendorId,
        storeId: shipment.storeId,
        provider: shipment.provider,
        merchantOrderRef: shipment.merchantOrderRef,
        recipient: {
          name: shipment.recipient.name,
          phone: shipment.recipient.phone,
          ...(shipment.recipient.secondaryPhone
            ? { secondaryPhone: shipment.recipient.secondaryPhone }
            : {}),
          address: shipment.recipient.address,
        },
        amountToCollectMinor: shipment.amountToCollectMinor,
        currencyCode: shipment.currencyCode,
        itemSummary: shipment.itemSummary,
        itemQuantity: shipment.lines.reduce((sum, l) => sum + l.quantity, 0),
        weightKg: shipment.weightKg,
        ...(shipment.note ? { note: shipment.note } : {}),
        ...(input.deliveryType !== undefined ? { deliveryType: input.deliveryType } : {}),
      });

      shipment.markShipped({
        providerConsignmentId: created.providerConsignmentId,
        trackingCode: created.trackingCode,
        providerStatus: created.providerStatus,
      });
      await this.shipments.save(shipment, input.idempotencyKey);

      await this.orders.fulfillShipmentLines({
        orderId: order.orderId,
        actorUserId: input.actorUserId,
        actorRoles: input.actorRoles,
        lines: input.lines,
      });
    } catch (error) {
      if (error instanceof CourierProviderError) {
        throw new FulfillmentValidationError(error.message);
      }
      throw error;
    }

    const result = toResponse(shipment);
    await this.shipments.saveOperation({
      idempotencyKey: input.idempotencyKey,
      operationType: 'CREATE_SHIPMENT',
      requestHash,
      responseJson: result as unknown as Record<string, unknown>,
    });
    return result;
  }
}

@Injectable()
export class SyncShipmentStatusHandler {
  constructor(
    @Inject(FULFILLMENT_REPOSITORY) private readonly shipments: FulfillmentRepository,
    @Inject(COURIER_PORT) private readonly courier: CourierPort,
    @Inject(PAYMENT_PORT) private readonly payments: PaymentPort,
    @Inject(FulfillmentAuthorizationService)
    private readonly authz: FulfillmentAuthorizationService,
  ) {}

  public async execute(input: {
    readonly shipmentId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly idempotencyKey: string;
  }): Promise<ShipmentResponse> {
    const shipment = await this.shipments.findById(input.shipmentId);
    if (!shipment) {
      throw new ShipmentNotFoundError();
    }
    await this.authz.requireFulfiller(shipment, input.actorUserId, input.actorRoles);

    if (shipment.provider === 'MANUAL') {
      return toResponse(shipment);
    }

    const status = await this.courier.getConsignmentStatus({
      vendorId: shipment.vendorId,
      provider: shipment.provider,
      ...(shipment.providerConsignmentId
        ? { providerConsignmentId: shipment.providerConsignmentId }
        : {}),
      ...(shipment.trackingCode ? { trackingCode: shipment.trackingCode } : {}),
      merchantOrderRef: shipment.merchantOrderRef,
    });

    const becameDelivered =
      status.normalizedStatus === 'DELIVERED' && shipment.status !== 'DELIVERED';

    shipment.applyProviderStatus(status.normalizedStatus, status.providerStatus);
    await this.shipments.save(shipment, `sync:${shipment.id.value}`);

    if (becameDelivered && shipment.amountToCollectMinor > 0) {
      const intent = await this.payments.findCodIntentByOrderId(shipment.orderId);
      if (intent && intent.status === 'AWAITING_COLLECTION') {
        await this.payments.confirmCodCollectionFromFulfillment({
          paymentIntentId: intent.paymentIntentId,
          amountMinor: intent.amountMinor,
          currencyCode: intent.currencyCode,
          idempotencyKey: input.idempotencyKey || `cod-deliver:${shipment.id.value}`,
          actorUserId: input.actorUserId,
          note: `Auto-collected on courier delivery (${shipment.provider})`,
        });
      }
    }

    return toResponse(shipment);
  }
}

@Injectable()
export class MarkShipmentDeliveredManualHandler {
  constructor(
    @Inject(FULFILLMENT_REPOSITORY) private readonly shipments: FulfillmentRepository,
    @Inject(PAYMENT_PORT) private readonly payments: PaymentPort,
    @Inject(FulfillmentAuthorizationService)
    private readonly authz: FulfillmentAuthorizationService,
  ) {}

  public async execute(input: {
    readonly shipmentId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly trackingCode?: string;
    readonly idempotencyKey: string;
  }): Promise<ShipmentResponse> {
    const shipment = await this.shipments.findById(input.shipmentId);
    if (!shipment) {
      throw new ShipmentNotFoundError();
    }
    await this.authz.requireFulfiller(shipment, input.actorUserId, input.actorRoles);
    shipment.markDeliveredManual(input.trackingCode);
    await this.shipments.save(shipment, `manual-deliver:${shipment.id.value}`);

    if (shipment.amountToCollectMinor > 0) {
      const intent = await this.payments.findCodIntentByOrderId(shipment.orderId);
      if (intent && intent.status === 'AWAITING_COLLECTION') {
        await this.payments.confirmCodCollectionFromFulfillment({
          paymentIntentId: intent.paymentIntentId,
          amountMinor: intent.amountMinor,
          currencyCode: intent.currencyCode,
          idempotencyKey: input.idempotencyKey,
          actorUserId: input.actorUserId,
          note: 'Manual delivery confirmation COD collect',
        });
      }
    }

    return toResponse(shipment);
  }
}

function toResponse(shipment: Shipment): ShipmentResponse {
  return {
    shipmentId: shipment.id.value,
    orderId: shipment.orderId,
    provider: shipment.provider,
    status: shipment.status,
    providerConsignmentId: shipment.providerConsignmentId,
    trackingCode: shipment.trackingCode,
    amountToCollectMinor: shipment.amountToCollectMinor,
    currencyCode: shipment.currencyCode,
  };
}

function hashCreate(input: CreateShipmentCommand): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        orderId: input.orderId,
        provider: input.provider,
        lines: input.lines,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        weightKg: input.weightKg ?? 0.5,
      }),
    )
    .digest('hex');
}
