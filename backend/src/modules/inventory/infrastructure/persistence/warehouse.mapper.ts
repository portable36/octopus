import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { Warehouse } from '../../domain/aggregates/warehouse.aggregate';
import { WarehouseOrmEntity } from './warehouse.orm-entity';

export function warehouseToDomain(entity: WarehouseOrmEntity): Warehouse {
  return Warehouse.reconstitute(UniqueID.from(entity.id), {
    vendorId: entity.vendorId,
    storeId: entity.storeId,
    code: entity.code,
    name: entity.name,
    status: entity.status,
    addressLine: entity.addressLine,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}

export function applyWarehouseToOrm(warehouse: Warehouse, entity: WarehouseOrmEntity): void {
  const props = warehouse.toProps();
  entity.id = warehouse.id.value;
  entity.vendorId = props.vendorId;
  entity.storeId = props.storeId;
  entity.code = props.code;
  entity.name = props.name;
  entity.status = props.status;
  entity.addressLine = props.addressLine;
  entity.createdAt = props.createdAt;
  entity.updatedAt = props.updatedAt;
}
