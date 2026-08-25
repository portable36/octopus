import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  InvalidReturnInspectionError,
  InvalidReturnReasonError,
  InvalidReturnTransitionError,
  ReturnQuantityExceededError,
} from '../errors/returns.errors';
import {
  getReturnReason,
  type ReturnInspectionSnapshot,
  type ReturnItemCondition,
  type ReturnLineSnapshot,
  type ReturnReasonCode,
  type ReturnStatus,
} from '../returns.types';

interface ReturnRequestProps {
  readonly orderId: string;
  readonly customerId: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly status: ReturnStatus;
  readonly customerNote: string | null;
  readonly rejectionReasonCode: string | null;
  readonly rejectionNote: string | null;
  readonly items: readonly ReturnLineSnapshot[];
  readonly inspection: ReturnInspectionSnapshot | null;
  readonly requestedAt: Date;
  readonly reviewedAt: Date | null;
  readonly approvedAt: Date | null;
  readonly receivedAt: Date | null;
  readonly inspectedAt: Date | null;
  readonly completedAt: Date | null;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const ALLOWED: Record<ReturnStatus, readonly ReturnStatus[]> = {
  REQUESTED: ['UNDER_REVIEW', 'CANCELLED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED'],
  REJECTED: [],
  APPROVED: ['AWAITING_RETURN', 'CANCELLED'],
  AWAITING_RETURN: ['RECEIVED', 'CANCELLED'],
  RECEIVED: ['INSPECTING'],
  INSPECTING: ['INSPECTION_APPROVED', 'INSPECTION_REJECTED'],
  INSPECTION_REJECTED: [],
  INSPECTION_APPROVED: [],
  CANCELLED: [],
};

export class ReturnRequest extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: ReturnRequestProps,
  ) {
    super(id);
  }

  public static create(input: {
    readonly orderId: string;
    readonly customerId: string;
    readonly vendorId: string;
    readonly storeId: string;
    readonly customerNote?: string | null;
    readonly items: readonly {
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
    }[];
  }): ReturnRequest {
    if (input.items.length === 0) {
      throw new ReturnQuantityExceededError('Return requires at least one item.');
    }
    const items = input.items.map((item) => {
      if (!getReturnReason(item.reasonCode)) {
        throw new InvalidReturnReasonError(item.reasonCode);
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new ReturnQuantityExceededError('Invalid return item quantity.');
      }
      return {
        orderItemId: item.orderItemId,
        productId: item.productId,
        variantId: item.variantId,
        warehouseId: item.warehouseId,
        sku: item.sku,
        productName: item.productName,
        unitPriceMinor: item.unitPriceMinor,
        lineDiscountMinor: item.lineDiscountMinor,
        lineTaxMinor: item.lineTaxMinor,
        lineTotalMinor: item.lineTotalMinor,
        quantity: item.quantity,
        reasonCode: item.reasonCode,
        condition: 'UNKNOWN' as const,
      };
    });
    const now = new Date();
    const aggregate = new ReturnRequest(UniqueID.create(), {
      orderId: input.orderId,
      customerId: input.customerId,
      vendorId: input.vendorId,
      storeId: input.storeId,
      status: 'REQUESTED',
      customerNote: input.customerNote?.trim() || null,
      rejectionReasonCode: null,
      rejectionNote: null,
      items: Object.freeze(items),
      inspection: null,
      requestedAt: now,
      reviewedAt: null,
      approvedAt: null,
      receivedAt: null,
      inspectedAt: null,
      completedAt: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    aggregate.addEvent('ReturnRequested', {
      returnId: aggregate.id.value,
      orderId: input.orderId,
      vendorId: input.vendorId,
      storeId: input.storeId,
      customerId: input.customerId,
    });
    return aggregate;
  }

  public static rehydrate(id: UniqueID, props: ReturnRequestProps): ReturnRequest {
    return new ReturnRequest(id, {
      ...props,
      items: Object.freeze(props.items.map((i) => ({ ...i }))),
      inspection: props.inspection ? { ...props.inspection } : null,
    });
  }

  get orderId(): string {
    return this.props.orderId;
  }
  get customerId(): string {
    return this.props.customerId;
  }
  get vendorId(): string {
    return this.props.vendorId;
  }
  get storeId(): string {
    return this.props.storeId;
  }
  get status(): ReturnStatus {
    return this.props.status;
  }
  get customerNote(): string | null {
    return this.props.customerNote;
  }
  get rejectionReasonCode(): string | null {
    return this.props.rejectionReasonCode;
  }
  get rejectionNote(): string | null {
    return this.props.rejectionNote;
  }
  get items(): readonly ReturnLineSnapshot[] {
    return this.props.items;
  }
  get inspection(): ReturnInspectionSnapshot | null {
    return this.props.inspection;
  }
  get requestedAt(): Date {
    return this.props.requestedAt;
  }
  get reviewedAt(): Date | null {
    return this.props.reviewedAt;
  }
  get approvedAt(): Date | null {
    return this.props.approvedAt;
  }
  get receivedAt(): Date | null {
    return this.props.receivedAt;
  }
  get inspectedAt(): Date | null {
    return this.props.inspectedAt;
  }
  get completedAt(): Date | null {
    return this.props.completedAt;
  }
  get version(): number {
    return this.props.version;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public startReview(): void {
    this.transition('UNDER_REVIEW', { reviewedAt: new Date() });
  }

  public approve(): void {
    if (this.props.status === 'REQUESTED') {
      this.startReview();
    }
    const now = new Date();
    this.transition('APPROVED', { approvedAt: now, reviewedAt: this.props.reviewedAt ?? now });
    this.transition('AWAITING_RETURN', {});
    this.addEvent('ReturnApproved', {
      returnId: this.id.value,
      orderId: this.props.orderId,
      vendorId: this.props.vendorId,
      storeId: this.props.storeId,
    });
  }

  public reject(input: { readonly reasonCode: string; readonly note?: string | null }): void {
    if (!input.reasonCode.trim()) {
      throw new InvalidReturnReasonError(input.reasonCode);
    }
    const now = new Date();
    this.transition('REJECTED', {
      rejectionReasonCode: input.reasonCode.trim(),
      rejectionNote: input.note?.trim() || null,
      reviewedAt: this.props.reviewedAt ?? now,
      completedAt: now,
    });
    this.addEvent('ReturnRejected', {
      returnId: this.id.value,
      orderId: this.props.orderId,
      reasonCode: input.reasonCode.trim(),
    });
  }

  public cancel(): void {
    const now = new Date();
    this.transition('CANCELLED', { completedAt: now });
  }

  public markReceived(): void {
    const now = new Date();
    this.transition('RECEIVED', { receivedAt: now });
    this.addEvent('ReturnReceived', {
      returnId: this.id.value,
      orderId: this.props.orderId,
    });
  }

  public startInspection(): void {
    this.transition('INSPECTING', {});
  }

  public completeInspection(input: {
    readonly quantityReceived: number;
    readonly quantityAccepted: number;
    readonly quantityRejected: number;
    readonly condition: ReturnItemCondition;
    readonly reason?: string | null;
    readonly note?: string | null;
    readonly inspectedBy: string;
  }): void {
    const approvedQty = this.props.items.reduce((sum, i) => sum + i.quantity, 0);
    if (
      !Number.isInteger(input.quantityReceived) ||
      !Number.isInteger(input.quantityAccepted) ||
      !Number.isInteger(input.quantityRejected) ||
      input.quantityReceived < 0 ||
      input.quantityAccepted < 0 ||
      input.quantityRejected < 0
    ) {
      throw new InvalidReturnInspectionError(
        'Inspection quantities must be non-negative integers.',
      );
    }
    if (input.quantityAccepted + input.quantityRejected !== input.quantityReceived) {
      throw new InvalidReturnInspectionError('accepted + rejected must equal received.');
    }
    if (input.quantityReceived > approvedQty) {
      throw new InvalidReturnInspectionError('received cannot exceed approved return quantity.');
    }

    const now = new Date();
    const inspection: ReturnInspectionSnapshot = {
      quantityReceived: input.quantityReceived,
      quantityAccepted: input.quantityAccepted,
      quantityRejected: input.quantityRejected,
      condition: input.condition,
      reason: input.reason?.trim() || null,
      note: input.note?.trim() || null,
      inspectedBy: input.inspectedBy,
      inspectedAt: now,
    };

    const nextStatus: ReturnStatus =
      input.quantityAccepted > 0 ? 'INSPECTION_APPROVED' : 'INSPECTION_REJECTED';

    this.transition(nextStatus, {
      inspection,
      inspectedAt: now,
      completedAt: now,
    });
    this.addEvent('ReturnInspected', {
      returnId: this.id.value,
      orderId: this.props.orderId,
      status: nextStatus,
      quantityAccepted: input.quantityAccepted,
      quantityRejected: input.quantityRejected,
    });
  }

  public toProps(): ReturnRequestProps {
    return { ...this.props };
  }

  private transition(
    next: ReturnStatus,
    patch: Partial<
      Pick<
        ReturnRequestProps,
        | 'reviewedAt'
        | 'approvedAt'
        | 'receivedAt'
        | 'inspectedAt'
        | 'completedAt'
        | 'rejectionReasonCode'
        | 'rejectionNote'
        | 'inspection'
      >
    >,
  ): void {
    // approve() chains APPROVED → AWAITING_RETURN in one command.
    if (this.props.status === 'APPROVED' && next === 'AWAITING_RETURN') {
      this.props = {
        ...this.props,
        ...patch,
        status: next,
        version: this.props.version + 1,
        updatedAt: new Date(),
      };
      return;
    }
    // receive may jump RECEIVED → INSPECTING in one staff action.
    if (this.props.status === 'RECEIVED' && next === 'INSPECTING') {
      this.props = {
        ...this.props,
        ...patch,
        status: next,
        version: this.props.version + 1,
        updatedAt: new Date(),
      };
      return;
    }
    // inspect completes from INSPECTING.
    if (
      this.props.status === 'INSPECTING' &&
      (next === 'INSPECTION_APPROVED' || next === 'INSPECTION_REJECTED')
    ) {
      this.props = {
        ...this.props,
        ...patch,
        status: next,
        version: this.props.version + 1,
        updatedAt: new Date(),
      };
      return;
    }

    const allowed = ALLOWED[this.props.status];
    if (!allowed.includes(next)) {
      throw new InvalidReturnTransitionError(this.props.status, next);
    }
    this.props = {
      ...this.props,
      ...patch,
      status: next,
      version: this.props.version + 1,
      updatedAt: new Date(),
    };
  }
}
