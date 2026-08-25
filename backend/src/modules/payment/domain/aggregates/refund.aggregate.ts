import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  InvalidPaymentMoneyError,
  InvalidRefundStateError,
  RefundExceedsAvailableError,
} from '../errors/payment.errors';
import type { RefundMethod, RefundStatus } from '../refund.types';
import { buildRefundLedgerAllocation } from '../services/build-refund-ledger-allocation';

interface RefundProps {
  readonly paymentIntentId: string;
  readonly orderId: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly returnId: string | null;
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly method: RefundMethod;
  readonly status: RefundStatus;
  readonly reason: string | null;
  readonly providerRefundId: string | null;
  readonly providerResponseCode: string | null;
  readonly providerReceivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly completedAt: Date | null;
}

export class Refund extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: RefundProps,
  ) {
    super(id);
  }

  public static create(input: {
    readonly paymentIntentId: string;
    readonly orderId: string;
    readonly vendorId: string;
    readonly storeId: string;
    readonly returnId?: string | null;
    readonly amountMinor: number;
    readonly currencyCode: string;
    readonly method: RefundMethod;
    readonly reason?: string | null;
    readonly availableMinor: number;
  }): Refund {
    if (!Number.isInteger(input.amountMinor) || input.amountMinor < 1) {
      throw new InvalidPaymentMoneyError('Refund amount must be a positive integer.');
    }
    const currency = input.currencyCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new InvalidPaymentMoneyError('Currency must be a 3-letter ISO code.');
    }
    if (input.amountMinor > input.availableMinor) {
      throw new RefundExceedsAvailableError(
        `Requested ${input.amountMinor} exceeds available ${input.availableMinor}.`,
      );
    }

    const now = new Date();
    const refund = new Refund(UniqueID.create(), {
      paymentIntentId: input.paymentIntentId,
      orderId: input.orderId,
      vendorId: input.vendorId,
      storeId: input.storeId,
      returnId: input.returnId ?? null,
      amountMinor: input.amountMinor,
      currencyCode: currency,
      method: input.method,
      status: 'PENDING',
      reason: input.reason?.trim() || null,
      providerRefundId: null,
      providerResponseCode: null,
      providerReceivedAt: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    });
    refund.addEvent('RefundRequested', {
      refundId: refund.id.value,
      paymentIntentId: refund.paymentIntentId,
      orderId: refund.orderId,
      amountMinor: refund.amountMinor,
      currencyCode: refund.currencyCode,
      method: refund.method,
      returnId: refund.returnId,
    });
    return refund;
  }

  public static reconstitute(id: UniqueID, props: RefundProps): Refund {
    return new Refund(id, props);
  }

  get paymentIntentId(): string {
    return this.props.paymentIntentId;
  }
  get orderId(): string {
    return this.props.orderId;
  }
  get vendorId(): string {
    return this.props.vendorId;
  }
  get storeId(): string {
    return this.props.storeId;
  }
  get returnId(): string | null {
    return this.props.returnId;
  }
  get amountMinor(): number {
    return this.props.amountMinor;
  }
  get currencyCode(): string {
    return this.props.currencyCode;
  }
  get method(): RefundMethod {
    return this.props.method;
  }
  get status(): RefundStatus {
    return this.props.status;
  }
  get reason(): string | null {
    return this.props.reason;
  }
  get providerRefundId(): string | null {
    return this.props.providerRefundId;
  }
  get providerResponseCode(): string | null {
    return this.props.providerResponseCode;
  }
  get providerReceivedAt(): Date | null {
    return this.props.providerReceivedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
  get completedAt(): Date | null {
    return this.props.completedAt;
  }

  public markSucceeded(input: {
    readonly providerRefundId: string | null;
    readonly providerResponseCode: string;
    readonly providerReceivedAt: Date;
  }): void {
    if (this.props.status !== 'PENDING') {
      throw new InvalidRefundStateError(`Cannot succeed refund in status ${this.props.status}.`);
    }
    const now = new Date();
    this.props = {
      ...this.props,
      status: 'SUCCEEDED',
      providerRefundId: input.providerRefundId,
      providerResponseCode: input.providerResponseCode,
      providerReceivedAt: input.providerReceivedAt,
      updatedAt: now,
      completedAt: now,
    };
    this.addEvent('RefundCompleted', {
      refundId: this.id.value,
      paymentIntentId: this.paymentIntentId,
      orderId: this.orderId,
      vendorId: this.vendorId,
      storeId: this.storeId,
      amountMinor: this.amountMinor,
      currencyCode: this.currencyCode,
      method: this.method,
      returnId: this.returnId,
      providerRefundId: this.providerRefundId,
      allocation: buildRefundLedgerAllocation({
        refundId: this.id.value,
        paymentIntentId: this.paymentIntentId,
        orderId: this.orderId,
        vendorId: this.vendorId,
        storeId: this.storeId,
        returnId: this.returnId,
        amountMinor: this.amountMinor,
        currencyCode: this.currencyCode,
        method: this.method,
      }),
    });
  }

  public markFailed(input: {
    readonly providerResponseCode: string;
    readonly providerReceivedAt: Date;
  }): void {
    if (this.props.status !== 'PENDING') {
      throw new InvalidRefundStateError(`Cannot fail refund in status ${this.props.status}.`);
    }
    const now = new Date();
    this.props = {
      ...this.props,
      status: 'FAILED',
      providerResponseCode: input.providerResponseCode,
      providerReceivedAt: input.providerReceivedAt,
      updatedAt: now,
      completedAt: now,
    };
    this.addEvent('RefundFailed', {
      refundId: this.id.value,
      paymentIntentId: this.paymentIntentId,
      orderId: this.orderId,
      providerResponseCode: input.providerResponseCode,
    });
  }
}
