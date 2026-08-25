import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  InvalidPayoutAmountError,
  InvalidPayoutRejectionError,
  InvalidPayoutTransitionError,
} from '../errors/payout.errors';
import type { PayoutStatus } from '../payout.types';

interface VendorPayoutProps {
  readonly vendorId: string;
  readonly storeId: string;
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly status: PayoutStatus;
  readonly idempotencyKey: string;
  readonly requestedByUserId: string;
  readonly rejectionReason: string | null;
  readonly failureReason: string | null;
  readonly providerRef: string | null;
  readonly ledgerEntryId: string | null;
  readonly requestedAt: Date;
  readonly reviewedAt: Date | null;
  readonly approvedAt: Date | null;
  readonly processingAt: Date | null;
  readonly completedAt: Date | null;
  readonly failedAt: Date | null;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const ALLOWED: Record<PayoutStatus, readonly PayoutStatus[]> = {
  REQUESTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['PROCESSING'],
  PROCESSING: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
  REJECTED: [],
};

export class VendorPayout extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: VendorPayoutProps,
  ) {
    super(id);
  }

  public static create(input: {
    readonly vendorId: string;
    readonly storeId: string;
    readonly amountMinor: number;
    readonly currencyCode: string;
    readonly idempotencyKey: string;
    readonly requestedByUserId: string;
  }): VendorPayout {
    if (!Number.isInteger(input.amountMinor) || input.amountMinor < 1) {
      throw new InvalidPayoutAmountError();
    }
    const currency = input.currencyCode.trim().toUpperCase();
    if (currency.length !== 3) {
      throw new InvalidPayoutAmountError('currencyCode must be a 3-letter ISO code.');
    }
    const now = new Date();
    const payout = new VendorPayout(UniqueID.create(), {
      vendorId: input.vendorId,
      storeId: input.storeId,
      amountMinor: input.amountMinor,
      currencyCode: currency,
      status: 'REQUESTED',
      idempotencyKey: input.idempotencyKey,
      requestedByUserId: input.requestedByUserId,
      rejectionReason: null,
      failureReason: null,
      providerRef: null,
      ledgerEntryId: null,
      requestedAt: now,
      reviewedAt: null,
      approvedAt: null,
      processingAt: null,
      completedAt: null,
      failedAt: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    // Vendor request enters review immediately.
    payout.submitForReview();
    return payout;
  }

  public static rehydrate(id: UniqueID, props: VendorPayoutProps): VendorPayout {
    return new VendorPayout(id, props);
  }

  get vendorId(): string {
    return this.props.vendorId;
  }
  get storeId(): string {
    return this.props.storeId;
  }
  get amountMinor(): number {
    return this.props.amountMinor;
  }
  get currencyCode(): string {
    return this.props.currencyCode;
  }
  get status(): PayoutStatus {
    return this.props.status;
  }
  get idempotencyKey(): string {
    return this.props.idempotencyKey;
  }
  get requestedByUserId(): string {
    return this.props.requestedByUserId;
  }
  get rejectionReason(): string | null {
    return this.props.rejectionReason;
  }
  get failureReason(): string | null {
    return this.props.failureReason;
  }
  get providerRef(): string | null {
    return this.props.providerRef;
  }
  get ledgerEntryId(): string | null {
    return this.props.ledgerEntryId;
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
  get processingAt(): Date | null {
    return this.props.processingAt;
  }
  get completedAt(): Date | null {
    return this.props.completedAt;
  }
  get failedAt(): Date | null {
    return this.props.failedAt;
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

  public submitForReview(): void {
    this.transition('UNDER_REVIEW', { reviewedAt: new Date() });
  }

  public approve(): void {
    this.transition('APPROVED', { approvedAt: new Date() });
  }

  public reject(reason: string): void {
    const trimmed = reason.trim();
    if (!trimmed) {
      throw new InvalidPayoutRejectionError();
    }
    this.transition('REJECTED', { rejectionReason: trimmed, reviewedAt: new Date() });
  }

  public startProcessing(): void {
    this.transition('PROCESSING', { processingAt: new Date() });
  }

  public complete(input: { readonly providerRef: string; readonly ledgerEntryId: string }): void {
    this.transition('COMPLETED', {
      providerRef: input.providerRef,
      ledgerEntryId: input.ledgerEntryId,
      completedAt: new Date(),
    });
  }

  public fail(reason: string): void {
    const trimmed = reason.trim() || 'Provider disbursement failed.';
    this.transition('FAILED', { failureReason: trimmed, failedAt: new Date() });
  }

  private transition(
    to: PayoutStatus,
    patch: Partial<
      Pick<
        VendorPayoutProps,
        | 'reviewedAt'
        | 'approvedAt'
        | 'processingAt'
        | 'completedAt'
        | 'failedAt'
        | 'rejectionReason'
        | 'failureReason'
        | 'providerRef'
        | 'ledgerEntryId'
      >
    >,
  ): void {
    const from = this.props.status;
    if (!ALLOWED[from].includes(to)) {
      throw new InvalidPayoutTransitionError(from, to);
    }
    const now = new Date();
    this.props = {
      ...this.props,
      ...patch,
      status: to,
      version: this.props.version + 1,
      updatedAt: now,
    };
  }
}
