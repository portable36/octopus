export type ReturnStatus =
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'REJECTED'
  | 'APPROVED'
  | 'AWAITING_RETURN'
  | 'RECEIVED'
  | 'INSPECTING'
  | 'INSPECTION_REJECTED'
  | 'INSPECTION_APPROVED'
  | 'CANCELLED';

export type ReturnItemCondition =
  'NEW' | 'LIKE_NEW' | 'USED' | 'DAMAGED' | 'DEFECTIVE' | 'UNSELLABLE' | 'UNKNOWN';

export type ReturnReasonCode =
  | 'DAMAGED'
  | 'DEFECTIVE'
  | 'WRONG_ITEM'
  | 'WRONG_VARIANT'
  | 'MISSING_ITEM'
  | 'NOT_AS_DESCRIBED'
  | 'SIZE_ISSUE'
  | 'CUSTOMER_CHANGED_MIND'
  | 'OTHER';

export type ReturnReasonDefinition = {
  readonly code: ReturnReasonCode;
  readonly label: string;
  readonly requiresInspection: boolean;
  readonly customerSelectable: boolean;
  readonly active: boolean;
};

export const RETURN_REASONS: readonly ReturnReasonDefinition[] = [
  {
    code: 'DAMAGED',
    label: 'Damaged',
    requiresInspection: true,
    customerSelectable: true,
    active: true,
  },
  {
    code: 'DEFECTIVE',
    label: 'Defective',
    requiresInspection: true,
    customerSelectable: true,
    active: true,
  },
  {
    code: 'WRONG_ITEM',
    label: 'Wrong item',
    requiresInspection: true,
    customerSelectable: true,
    active: true,
  },
  {
    code: 'WRONG_VARIANT',
    label: 'Wrong variant',
    requiresInspection: true,
    customerSelectable: true,
    active: true,
  },
  {
    code: 'MISSING_ITEM',
    label: 'Missing item',
    requiresInspection: true,
    customerSelectable: true,
    active: true,
  },
  {
    code: 'NOT_AS_DESCRIBED',
    label: 'Not as described',
    requiresInspection: true,
    customerSelectable: true,
    active: true,
  },
  {
    code: 'SIZE_ISSUE',
    label: 'Size issue',
    requiresInspection: false,
    customerSelectable: true,
    active: true,
  },
  {
    code: 'CUSTOMER_CHANGED_MIND',
    label: 'Changed mind',
    requiresInspection: false,
    customerSelectable: true,
    active: true,
  },
  {
    code: 'OTHER',
    label: 'Other',
    requiresInspection: true,
    customerSelectable: true,
    active: true,
  },
] as const;

export function getReturnReason(code: string): ReturnReasonDefinition | undefined {
  return RETURN_REASONS.find((r) => r.code === code && r.active);
}

/** Failed terminals — quantities no longer reserved against returnable stock. */
export const RETURN_QTY_RELEASE_STATUSES: readonly ReturnStatus[] = [
  'REJECTED',
  'CANCELLED',
  'INSPECTION_REJECTED',
];

export type ReturnLineSnapshot = {
  readonly orderItemId: string;
  readonly productId: string;
  readonly variantId: string;
  readonly warehouseId: string;
  readonly sku: string;
  readonly productName: string;
  readonly unitPriceMinor: number;
  readonly lineDiscountMinor: number;
  readonly lineTaxMinor: number;
  readonly lineTotalMinor: number;
  readonly quantity: number;
  readonly reasonCode: ReturnReasonCode;
  readonly condition: ReturnItemCondition;
};

export type ReturnInspectionSnapshot = {
  readonly quantityReceived: number;
  readonly quantityAccepted: number;
  readonly quantityRejected: number;
  readonly condition: ReturnItemCondition;
  readonly reason: string | null;
  readonly note: string | null;
  readonly inspectedBy: string;
  readonly inspectedAt: Date;
};

/** ponytail: defaults only; Settings `returns` key when admin UI needs overrides. */
export const DEFAULT_RETURN_WINDOW_DAYS = 7;

export interface PublicOrderReturnLookupResult {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly customerId: string | null;
  readonly customerEmail: string | null;
  readonly status: string;
  readonly paymentStatus: string;
  readonly fulfillmentStatus: string;
  readonly currencyCode: string;
  readonly totalMinor: number;
  readonly orderDate: Date;
  readonly returnEligible: boolean;
  readonly returnIneligibleReason: string | null;
  readonly returnWindowDays: number;
  readonly daysRemainingInReturnWindow: number;
  readonly lines: readonly {
    readonly orderItemId: string;
    readonly productId: string;
    readonly variantId: string;
    readonly productName: string;
    readonly unitPriceMinor: number;
    readonly quantity: number;
    readonly fulfilledQuantity: number;
    readonly alreadyReturnedQuantity: number;
    readonly returnableQuantity: number;
  }[];
  readonly existingReturns: readonly {
    readonly returnId: string;
    readonly status: ReturnStatus;
    readonly requestedAt: Date;
    readonly itemCount: number;
    readonly totalQuantity: number;
  }[];
}

export interface ReturnTimelineMilestone {
  readonly key: string;
  readonly label: string;
  readonly state: 'COMPLETED' | 'CURRENT' | 'UPCOMING' | 'REJECTED' | 'CANCELLED';
  readonly timestamp: string | null;
  readonly description: string;
}

export interface ReturnTimelineItem {
  readonly orderItemId: string;
  readonly productId: string;
  readonly variantId: string;
  readonly sku: string;
  readonly productName: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
  readonly lineTotalMinor: number;
  readonly reasonCode: string;
  readonly reasonLabel: string;
}

export interface ReturnTimelineInspection {
  readonly condition: string;
  readonly quantityReceived: number;
  readonly quantityAccepted: number;
  readonly quantityRejected: number;
  readonly inspectedAt: string;
  readonly note: string | null;
  readonly reason: string | null;
}

export interface ReturnTimelineResult {
  readonly id: string;
  readonly orderId: string;
  readonly orderNumber: string;
  readonly status: ReturnStatus;
  readonly statusLabel: string;
  readonly statusDescription: string;
  readonly customerNote: string | null;
  readonly rejectionReasonCode: string | null;
  readonly rejectionNote: string | null;
  readonly canCancel: boolean;
  readonly requestedAt: string;
  readonly reviewedAt: string | null;
  readonly approvedAt: string | null;
  readonly receivedAt: string | null;
  readonly inspectedAt: string | null;
  readonly completedAt: string | null;
  readonly returnShipmentId: string | null;
  readonly returnTrackingCode: string | null;
  readonly items: readonly ReturnTimelineItem[];
  readonly inspection: ReturnTimelineInspection | null;
  readonly milestones: readonly ReturnTimelineMilestone[];
}
