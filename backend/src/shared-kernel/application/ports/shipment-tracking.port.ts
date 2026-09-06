export const SHIPMENT_TRACKING_PORT = Symbol('SHIPMENT_TRACKING_PORT');

export interface ShipmentTrackingInfo {
  readonly shipmentId: string;
  readonly orderId: string;
  readonly provider: string;
  readonly status: string;
  readonly providerStatus: string | null;
  readonly trackingCode: string | null;
  readonly providerConsignmentId: string | null;
  readonly recipientName: string;
  readonly recipientPhone: string;
  readonly recipientAddress: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ShipmentTrackingPort {
  getShipmentsForOrder(orderId: string): Promise<readonly ShipmentTrackingInfo[]>;
}
