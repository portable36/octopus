import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { InvalidReceiptSnapshotError } from '../errors/pos.errors';
import type { ReceiptSaleSnapshot, ReceiptStatus } from '../receipt.types';

interface ReceiptProps {
  readonly storeId: string;
  readonly vendorId: string;
  readonly saleId: string;
  readonly receiptNumber: string;
  readonly templateId: string;
  readonly templateVersionUsed: number;
  readonly snapshot: ReceiptSaleSnapshot;
  readonly renderedText: string;
  readonly status: ReceiptStatus;
  readonly createdAt: Date;
  readonly createdBy: string;
}

export class Receipt extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: ReceiptProps,
  ) {
    super(id);
  }

  public static create(input: {
    readonly storeId: string;
    readonly vendorId: string;
    readonly saleId: string;
    readonly receiptNumber: string;
    readonly templateId: string;
    readonly templateVersionUsed: number;
    readonly snapshot: ReceiptSaleSnapshot;
    readonly renderedText: string;
    readonly createdBy: string;
  }): Receipt {
    if (!input.receiptNumber.trim()) {
      throw new InvalidReceiptSnapshotError('Receipt number is required.');
    }
    if (!input.renderedText.trim()) {
      throw new InvalidReceiptSnapshotError('Rendered receipt text is required.');
    }
    if (input.snapshot.saleId !== input.saleId) {
      throw new InvalidReceiptSnapshotError('Snapshot saleId must match receipt saleId.');
    }
    if (input.snapshot.receiptNumber !== input.receiptNumber) {
      throw new InvalidReceiptSnapshotError('Snapshot receiptNumber must match receipt number.');
    }

    const receipt = new Receipt(UniqueID.create(), {
      storeId: input.storeId,
      vendorId: input.vendorId,
      saleId: input.saleId,
      receiptNumber: input.receiptNumber,
      templateId: input.templateId,
      templateVersionUsed: input.templateVersionUsed,
      snapshot: input.snapshot,
      renderedText: input.renderedText,
      status: 'REQUESTED',
      createdAt: new Date(),
      createdBy: input.createdBy,
    });

    receipt.addEvent('ReceiptRequested', {
      receiptId: receipt.id.value,
      storeId: receipt.storeId,
      saleId: receipt.saleId,
      receiptNumber: receipt.receiptNumber,
    });
    return receipt;
  }

  public static reconstitute(id: UniqueID, props: ReceiptProps): Receipt {
    return new Receipt(id, props);
  }

  public markPrinted(): void {
    if (this.props.status === 'PRINTED') {
      return;
    }
    this.props = { ...this.props, status: 'PRINTED' };
    this.addEvent('ReceiptPrinted', {
      receiptId: this.id.value,
      storeId: this.storeId,
      receiptNumber: this.receiptNumber,
    });
  }

  public markFailed(reason: string): void {
    this.props = { ...this.props, status: 'FAILED' };
    this.addEvent('ReceiptPrintFailed', {
      receiptId: this.id.value,
      storeId: this.storeId,
      reason,
    });
  }

  get storeId(): string {
    return this.props.storeId;
  }

  get vendorId(): string {
    return this.props.vendorId;
  }

  get saleId(): string {
    return this.props.saleId;
  }

  get receiptNumber(): string {
    return this.props.receiptNumber;
  }

  get templateId(): string {
    return this.props.templateId;
  }

  get templateVersionUsed(): number {
    return this.props.templateVersionUsed;
  }

  get snapshot(): ReceiptSaleSnapshot {
    return this.props.snapshot;
  }

  get renderedText(): string {
    return this.props.renderedText;
  }

  get status(): ReceiptStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }

  public toProps(): ReceiptProps {
    return {
      ...this.props,
      snapshot: {
        ...this.props.snapshot,
        lines: [...this.props.snapshot.lines],
        payments: [...this.props.snapshot.payments],
      },
    };
  }
}

export function formatReceiptNumber(soldAt: Date, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new InvalidReceiptSnapshotError('Receipt sequence must be a positive integer.');
  }
  const yyyy = soldAt.getUTCFullYear().toString().padStart(4, '0');
  const mm = (soldAt.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = soldAt.getUTCDate().toString().padStart(2, '0');
  const seq = sequence.toString().padStart(5, '0');
  return `POS-${yyyy}${mm}${dd}-${seq}`;
}
