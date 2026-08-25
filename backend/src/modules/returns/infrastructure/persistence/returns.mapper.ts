import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { ReturnRequest } from '../../domain/aggregates/return-request.aggregate';
import type {
  ReturnInspectionSnapshot,
  ReturnLineSnapshot,
  ReturnStatus,
} from '../../domain/returns.types';
import type { ReturnRequestOrmEntity } from './returns.orm-entity';

export function returnRequestToDomain(entity: ReturnRequestOrmEntity): ReturnRequest {
  const inspection = entity.inspectionJson
    ? ({
        ...entity.inspectionJson,
        inspectedAt: new Date(String(entity.inspectionJson.inspectedAt)),
      } as ReturnInspectionSnapshot)
    : null;
  return ReturnRequest.rehydrate(UniqueID.from(entity.id), {
    orderId: entity.orderId,
    customerId: entity.customerId,
    vendorId: entity.vendorId,
    storeId: entity.storeId,
    status: entity.status,
    customerNote: entity.customerNote,
    rejectionReasonCode: entity.rejectionReasonCode,
    rejectionNote: entity.rejectionNote,
    items: (entity.itemsJson as unknown as ReturnLineSnapshot[]).map((item) => ({
      ...item,
      warehouseId: item.warehouseId ?? '',
    })),
    inspection,
    requestedAt: entity.requestedAt,
    reviewedAt: entity.reviewedAt,
    approvedAt: entity.approvedAt,
    receivedAt: entity.receivedAt,
    inspectedAt: entity.inspectedAt,
    completedAt: entity.completedAt,
    version: entity.version,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}

export function applyReturnRequestToOrm(
  aggregate: ReturnRequest,
  entity: ReturnRequestOrmEntity,
): void {
  entity.id = aggregate.id.value;
  entity.orderId = aggregate.orderId;
  entity.customerId = aggregate.customerId;
  entity.vendorId = aggregate.vendorId;
  entity.storeId = aggregate.storeId;
  entity.status = aggregate.status as ReturnStatus;
  entity.customerNote = aggregate.customerNote;
  entity.rejectionReasonCode = aggregate.rejectionReasonCode;
  entity.rejectionNote = aggregate.rejectionNote;
  entity.itemsJson = aggregate.items.map((i) => ({ ...i })) as unknown as Record<string, unknown>[];
  entity.inspectionJson = aggregate.inspection
    ? ({
        ...aggregate.inspection,
        inspectedAt: aggregate.inspection.inspectedAt.toISOString(),
      } as Record<string, unknown>)
    : null;
  entity.requestedAt = aggregate.requestedAt;
  entity.reviewedAt = aggregate.reviewedAt;
  entity.approvedAt = aggregate.approvedAt;
  entity.receivedAt = aggregate.receivedAt;
  entity.inspectedAt = aggregate.inspectedAt;
  entity.completedAt = aggregate.completedAt;
  entity.version = aggregate.version;
  entity.createdAt = aggregate.createdAt;
  entity.updatedAt = aggregate.updatedAt;
}
