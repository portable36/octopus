import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { VendorPayout } from '../../domain/aggregates/vendor-payout.aggregate';
import type { VendorPayoutOrmEntity } from './payout.orm-entity';

export function toPayoutAggregate(entity: VendorPayoutOrmEntity): VendorPayout {
  return VendorPayout.rehydrate(UniqueID.from(entity.id), {
    vendorId: entity.vendorId,
    storeId: entity.storeId,
    amountMinor: entity.amountMinor,
    currencyCode: entity.currencyCode,
    status: entity.status,
    idempotencyKey: entity.idempotencyKey,
    requestedByUserId: entity.requestedByUserId,
    rejectionReason: entity.rejectionReason,
    failureReason: entity.failureReason,
    providerRef: entity.providerRef,
    ledgerEntryId: entity.ledgerEntryId,
    requestedAt: entity.requestedAt,
    reviewedAt: entity.reviewedAt,
    approvedAt: entity.approvedAt,
    processingAt: entity.processingAt,
    completedAt: entity.completedAt,
    failedAt: entity.failedAt,
    version: entity.version,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}

export function applyPayoutAggregate(entity: VendorPayoutOrmEntity, payout: VendorPayout): void {
  entity.id = payout.id.value;
  entity.vendorId = payout.vendorId;
  entity.storeId = payout.storeId;
  entity.amountMinor = payout.amountMinor;
  entity.currencyCode = payout.currencyCode;
  entity.status = payout.status;
  entity.idempotencyKey = payout.idempotencyKey;
  entity.requestedByUserId = payout.requestedByUserId;
  entity.rejectionReason = payout.rejectionReason;
  entity.failureReason = payout.failureReason;
  entity.providerRef = payout.providerRef;
  entity.ledgerEntryId = payout.ledgerEntryId;
  entity.requestedAt = payout.requestedAt;
  entity.reviewedAt = payout.reviewedAt;
  entity.approvedAt = payout.approvedAt;
  entity.processingAt = payout.processingAt;
  entity.completedAt = payout.completedAt;
  entity.failedAt = payout.failedAt;
  entity.version = payout.version;
  entity.createdAt = payout.createdAt;
  entity.updatedAt = payout.updatedAt;
}
