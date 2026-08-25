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
