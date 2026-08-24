import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { Receipt } from '../../domain/aggregates/receipt.aggregate';
import type { ReceiptSaleSnapshot } from '../../domain/receipt.types';
import { ReceiptOrmEntity } from './receipt.orm-entity';

type StoredSnapshot = Omit<ReceiptSaleSnapshot, 'soldAt'> & { soldAt: string };

export function receiptToDomain(entity: ReceiptOrmEntity): Receipt {
  const stored = entity.snapshot as unknown as StoredSnapshot;
  const snapshot: ReceiptSaleSnapshot = {
    ...stored,
    soldAt: new Date(stored.soldAt),
  };
  return Receipt.reconstitute(UniqueID.from(entity.id), {
    storeId: entity.storeId,
    vendorId: entity.vendorId,
    saleId: entity.saleId,
    receiptNumber: entity.receiptNumber,
    templateId: entity.templateId,
    templateVersionUsed: entity.templateVersionUsed,
    snapshot,
    renderedText: entity.renderedText,
    status: entity.status,
    createdAt: entity.createdAt,
    createdBy: entity.createdBy,
  });
}

export function applyReceiptToOrm(receipt: Receipt, entity: ReceiptOrmEntity): void {
  const props = receipt.toProps();
  entity.id = receipt.id.value;
  entity.storeId = props.storeId;
  entity.vendorId = props.vendorId;
  entity.saleId = props.saleId;
  entity.receiptNumber = props.receiptNumber;
  entity.templateId = props.templateId;
  entity.templateVersionUsed = props.templateVersionUsed;
  entity.snapshot = {
    ...props.snapshot,
    soldAt: props.snapshot.soldAt.toISOString(),
  } as unknown as ReceiptSaleSnapshot;
  entity.renderedText = props.renderedText;
  entity.status = props.status;
  entity.createdAt = props.createdAt;
  entity.createdBy = props.createdBy;
}
