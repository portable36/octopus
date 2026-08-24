import type { NormalizedShipmentStatus } from '../../../../shared-kernel/application/ports/courier.port';

/** Map Steadfast delivery_status strings to Octopus shipment status. */
export function mapSteadfastStatus(raw: string): NormalizedShipmentStatus {
  const key = raw.trim().toLowerCase();
  switch (key) {
    case 'in_review':
    case 'pending':
      return 'PENDING';
    case 'hold':
      return 'PROCESSING';
    case 'delivered_approval_pending':
    case 'partial_delivered_approval_pending':
      return 'OUT_FOR_DELIVERY';
    case 'delivered':
      return 'DELIVERED';
    case 'partial_delivered':
      return 'DELIVERED';
    case 'cancelled':
    case 'cancelled_approval_pending':
    case 'unknown':
    case 'unknown_approval_pending':
      return 'FAILED';
    default:
      if (key.includes('deliver')) {
        return 'IN_TRANSIT';
      }
      return 'IN_TRANSIT';
  }
}

/** Map Pathao order_status / slug to Octopus shipment status. */
export function mapPathaoStatus(raw: string): NormalizedShipmentStatus {
  const key = raw.trim().toLowerCase().replace(/\s+/g, '_');
  switch (key) {
    case 'pending':
      return 'PENDING';
    case 'pickup':
    case 'pickup_requested':
    case 'assigned_for_pickup':
      return 'PROCESSING';
    case 'picked':
    case 'pickup_completed':
    case 'in_transit':
    case 'on_the_way':
      return 'IN_TRANSIT';
    case 'out_for_delivery':
      return 'OUT_FOR_DELIVERY';
    case 'delivered':
    case 'paid_return':
      return 'DELIVERED';
    case 'cancelled':
    case 'canceled':
    case 'return':
    case 'returned':
    case 'failed':
      return key.includes('return') ? 'RETURNED' : 'FAILED';
    default:
      return 'IN_TRANSIT';
  }
}

/** BDT minor (paisa) → major units (taka). Pathao requires integer taka. */
export function minorToMajorUnits(amountMinor: number, currencyCode: string): number {
  const code = currencyCode.trim().toUpperCase();
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new Error('amountMinor must be a non-negative integer.');
  }
  if (code === 'BDT' || code === 'USD' || code === 'EUR') {
    return Math.trunc(amountMinor / 100);
  }
  // Fail closed for unknown currencies at the adapter edge.
  throw new Error(`Unsupported currency for courier amount conversion: ${code}`);
}
