import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { Store } from '../../domain/aggregates/store.aggregate';
import type { StoreStaffMember } from '../../domain/store.types';
import { StoreOrmEntity } from './store.orm-entity';
import { StoreStaffOrmEntity } from './store-staff.orm-entity';

export function toDomain(entity: StoreOrmEntity): Store {
  const staff: StoreStaffMember[] = entity.staff.getItems().map((member) => ({
    userId: member.userId,
    role: member.role,
    addedAt: member.addedAt,
  }));

  return Store.rehydrate({
    id: entity.id,
    vendorId: entity.vendorId,
    profile: {
      displayName: entity.displayName,
      slug: entity.slug,
      description: entity.description,
    },
    address: {
      line1: entity.addressLine1,
      line2: entity.addressLine2,
      city: entity.city,
      region: entity.region,
      postalCode: entity.postalCode,
      countryCode: entity.countryCode,
    },
    settings: {
      currencyCode: entity.currencyCode,
      timezone: entity.timezone,
      locale: entity.locale,
      acceptsOnlineOrders: entity.acceptsOnlineOrders,
    },
    status: entity.status,
    staff,
  });
}

export function applyToOrm(store: Store, entity: StoreOrmEntity): void {
  entity.id = store.id.value;
  entity.vendorId = store.vendorId;
  entity.slug = store.profile.slug;
  entity.displayName = store.profile.displayName;
  entity.description = store.profile.description;
  entity.addressLine1 = store.address.line1;
  entity.addressLine2 = store.address.line2;
  entity.city = store.address.city;
  entity.region = store.address.region;
  entity.postalCode = store.address.postalCode;
  entity.countryCode = store.address.countryCode;
  entity.currencyCode = store.settings.currencyCode;
  entity.timezone = store.settings.timezone;
  entity.locale = store.settings.locale;
  entity.acceptsOnlineOrders = store.settings.acceptsOnlineOrders;
  entity.status = store.status;
  entity.updatedAt = new Date();

  if (!entity.createdAt) {
    entity.createdAt = new Date();
  }

  const existingByUser = new Map(
    entity.staff.isInitialized()
      ? entity.staff.getItems().map((item) => [item.userId, item] as const)
      : [],
  );

  entity.staff.removeAll();
  for (const member of store.staff) {
    const staffEntity = existingByUser.get(member.userId) ?? new StoreStaffOrmEntity();
    if (!staffEntity.id) {
      staffEntity.id = UniqueID.create().value;
    }
    staffEntity.userId = member.userId;
    staffEntity.role = member.role;
    staffEntity.addedAt = member.addedAt;
    staffEntity.store = entity;
    entity.staff.add(staffEntity);
  }
}
