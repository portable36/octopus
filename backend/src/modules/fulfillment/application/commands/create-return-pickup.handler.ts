import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  COURIER_PORT,
  type CourierPort,
} from '../../../../shared-kernel/application/ports/courier.port';
import {
  ORDER_PORT,
  type OrderPort,
} from '../../../../shared-kernel/application/ports/order.port';
import type {
  ScheduleReturnPickupInput,
  ScheduleReturnPickupResult,
} from '../../../../shared-kernel/application/ports/return-pickup.port';
import { Shipment } from '../../domain/aggregates/shipment.aggregate';
import {
  CourierProviderError,
  FulfillmentIdempotencyConflictError,
  FulfillmentValidationError,
} from '../errors/fulfillment.errors';
import {
  FULFILLMENT_REPOSITORY,
  type FulfillmentRepository,
} from '../ports/fulfillment-repository.interface';

function hashPickup(input: ScheduleReturnPickupInput): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        returnId: input.returnId,
        orderId: input.orderId,
        lines: input.lines,
        address: input.recipientAddress,
      }),
    )
    .digest('hex');
}

@Injectable()
export class CreateReturnPickupHandler {
  constructor(
    @Inject(FULFILLMENT_REPOSITORY) private readonly shipments: FulfillmentRepository,
    @Inject(ORDER_PORT) private readonly orders: OrderPort,
    @Inject(COURIER_PORT) private readonly courier: CourierPort,
  ) {}

  public async execute(input: ScheduleReturnPickupInput): Promise<ScheduleReturnPickupResult> {
    const requestHash = hashPickup(input);
    const prior = await this.shipments.findOperation(input.idempotencyKey);
    if (prior) {
      if (prior.requestHash !== requestHash) {
        throw new FulfillmentIdempotencyConflictError();
      }
      return prior.responseJson as unknown as ScheduleReturnPickupResult;
    }

    const existing = await this.shipments.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return {
        shipmentId: existing.id.value,
        trackingCode: existing.trackingCode,
        provider: existing.provider,
        providerConsignmentId: existing.providerConsignmentId,
      };
    }

    const order = await this.orders.getReturnSnapshot(input.orderId);
    if (!order) {
      throw new FulfillmentValidationError('Order not found for return pickup.');
    }
    if (order.vendorId !== input.vendorId || order.storeId !== input.storeId) {
      throw new FulfillmentValidationError('Return pickup vendor/store mismatch.');
    }
    if (input.lines.length === 0) {
      throw new FulfillmentValidationError('Return pickup requires at least one line.');
    }

    const trackingFallback = `RET-${input.returnId.replace(/-/g, '').slice(0, 10).toUpperCase()}`;
    const shipment = Shipment.create({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      vendorId: order.vendorId,
      storeId: order.storeId,
      provider: 'MANUAL',
      lines: input.lines.map((l) => ({ orderLineId: l.orderLineId, quantity: l.quantity })),
      recipient: {
        name: input.recipientName,
        phone: input.recipientPhone,
        secondaryPhone: null,
        address: input.recipientAddress,
      },
      amountToCollectMinor: 0,
      currencyCode: input.currencyCode,
      merchantOrderRef: `RET-${order.orderNumber}-${input.returnId.slice(0, 8)}`,
      itemSummary: `Return pickup ${input.returnId}`,
      weightKg: 0.5,
      note: `RETURN_PICKUP:${input.returnId}`,
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
          address: shipment.recipient.address,
        },
        amountToCollectMinor: 0,
        currencyCode: shipment.currencyCode,
        itemSummary: shipment.itemSummary,
        itemQuantity: shipment.lines.reduce((sum, l) => sum + l.quantity, 0),
        weightKg: shipment.weightKg,
        ...(shipment.note ? { note: shipment.note } : {}),
      });

      shipment.markShipped({
        providerConsignmentId: created.providerConsignmentId,
        trackingCode: created.trackingCode ?? trackingFallback,
        providerStatus: created.providerStatus,
      });
      await this.shipments.save(shipment, input.idempotencyKey);
    } catch (error) {
      if (error instanceof CourierProviderError) {
        throw new FulfillmentValidationError(error.message);
      }
      throw error;
    }

    const result: ScheduleReturnPickupResult = {
      shipmentId: shipment.id.value,
      trackingCode: shipment.trackingCode,
      provider: shipment.provider,
      providerConsignmentId: shipment.providerConsignmentId,
    };
    await this.shipments.saveOperation({
      idempotencyKey: input.idempotencyKey,
      operationType: 'CREATE_RETURN_PICKUP',
      requestHash,
      responseJson: result as unknown as Record<string, unknown>,
    });
    return result;
  }
}
