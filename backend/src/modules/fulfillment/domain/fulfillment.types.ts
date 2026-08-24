export type CourierProvider = 'STEADFAST' | 'PATHAO' | 'MANUAL';

export type ShipmentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETURNED';

export interface ShipmentLineSnapshot {
  readonly orderLineId: string;
  readonly quantity: number;
}

export interface ShipmentRecipientSnapshot {
  readonly name: string;
  readonly phone: string;
  readonly secondaryPhone: string | null;
  readonly address: string;
}
