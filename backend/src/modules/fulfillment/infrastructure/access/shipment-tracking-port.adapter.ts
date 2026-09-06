import { Inject, Injectable } from '@nestjs/common';
import type {
  ShipmentTrackingInfo,
  ShipmentTrackingPort,
} from '../../../../shared-kernel/application/ports/shipment-tracking.port';
import {
  FULFILLMENT_REPOSITORY,
  type FulfillmentRepository,
} from '../../application/ports/fulfillment-repository.interface';

@Injectable()
export class ShipmentTrackingAdapter implements ShipmentTrackingPort {
  constructor(
    @Inject(FULFILLMENT_REPOSITORY)
    private readonly repo: FulfillmentRepository,
  ) {}

  public async getShipmentsForOrder(orderId: string): Promise<readonly ShipmentTrackingInfo[]> {
    const shipments = await this.repo.findByOrderId(orderId);
    return shipments.map((shipment) => ({
      shipmentId: shipment.id.value,
      orderId: shipment.orderId,
      provider: shipment.provider,
      status: shipment.status,
      providerStatus: shipment.providerStatus,
      trackingCode: shipment.trackingCode,
      providerConsignmentId: shipment.providerConsignmentId,
      recipientName: shipment.recipient.name,
      recipientPhone: shipment.recipient.phone,
      recipientAddress: shipment.recipient.address,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    }));
  }
}
