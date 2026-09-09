export const RETURN_PICKUP_PORT = Symbol('RETURN_PICKUP_PORT');

export interface ScheduleReturnPickupInput {
  readonly returnId: string;
  readonly orderId: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly currencyCode: string;
  readonly lines: readonly { readonly orderLineId: string; readonly quantity: number }[];
  readonly recipientName: string;
  readonly recipientPhone: string;
  readonly recipientAddress: string;
  readonly idempotencyKey: string;
}

export interface ScheduleReturnPickupResult {
  readonly shipmentId: string;
  readonly trackingCode: string | null;
  readonly provider: 'MANUAL' | 'STEADFAST' | 'PATHAO';
  readonly providerConsignmentId: string | null;
}

/** Fulfillment seam for reverse/return pickups — no order line fulfill side effects. */
export interface ReturnPickupPort {
  schedulePickup(input: ScheduleReturnPickupInput): Promise<ScheduleReturnPickupResult>;
}
