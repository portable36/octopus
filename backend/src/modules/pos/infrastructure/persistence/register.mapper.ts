import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { Register } from '../../domain/aggregates/register.aggregate';
import { RegisterOrmEntity } from './register.orm-entity';

export function registerToDomain(entity: RegisterOrmEntity): Register {
  return Register.rehydrate(UniqueID.from(entity.id), {
    storeId: entity.storeId,
    vendorId: entity.vendorId,
    code: entity.code,
    name: entity.name,
    status: entity.status,
    notes: entity.notes,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}

export function applyRegisterToOrm(register: Register, entity: RegisterOrmEntity): void {
  entity.id = register.id.value;
  entity.storeId = register.storeId;
  entity.vendorId = register.vendorId;
  entity.code = register.code;
  entity.name = register.name;
  entity.status = register.status;
  entity.notes = register.notes;
  entity.createdAt = register.createdAt;
  entity.updatedAt = register.updatedAt;
}
