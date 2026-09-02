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
    storeCode: entity.storeCode,
    storeType: entity.storeType,
    ownershipKind: entity.ownershipKind,
    profile: {
      displayName: entity.displayName,
      slug: entity.slug,
      description: entity.description,
    },
    contact: {
      phone: entity.phone,
      email: entity.email,
      supportEmail: entity.supportEmail,
    },
    address: {
      line1: entity.addressLine1,
      line2: entity.addressLine2,
      city: entity.city,
      region: entity.region,
      postalCode: entity.postalCode,
      countryCode: entity.countryCode,
      latitude: entity.latitude,
      longitude: entity.longitude,
    },
    openingHours: entity.openingHours ?? [],
    settings: {
      currencyCode: entity.currencyCode,
      timezone: entity.timezone,
      locale: entity.locale,
      acceptsOnlineOrders: entity.acceptsOnlineOrders,
      codEnabled: entity.codEnabled,
      codMinAmountMinor: entity.codMinAmountMinor,
      codMaxAmountMinor: entity.codMaxAmountMinor,
      codReservationTtlHours: entity.codReservationTtlHours,
    },
    status: entity.status,
    staff,
  });
}

export function applyToOrm(store: Store, entity: StoreOrmEntity): void {
  entity.id = store.id.value;
  entity.vendorId = store.vendorId;
  entity.storeCode = store.storeCode;
  entity.storeType = store.storeType;
  entity.ownershipKind = store.ownershipKind;
  entity.slug = store.profile.slug;
  entity.displayName = store.profile.displayName;
  entity.description = store.profile.description;
  entity.phone = store.contact.phone;
  entity.email = store.contact.email;
  entity.supportEmail = store.contact.supportEmail;
  entity.addressLine1 = store.address.line1;
  entity.addressLine2 = store.address.line2;
  entity.city = store.address.city;
  entity.region = store.address.region;
  entity.postalCode = store.address.postalCode;
  entity.countryCode = store.address.countryCode;
  entity.latitude = store.address.latitude;
  entity.longitude = store.address.longitude;
  entity.openingHours = [...store.openingHours];
  entity.currencyCode = store.settings.currencyCode;
  entity.timezone = store.settings.timezone;
  entity.locale = store.settings.locale;
  entity.acceptsOnlineOrders = store.settings.acceptsOnlineOrders;
  entity.codEnabled = store.settings.codEnabled;
  entity.codMinAmountMinor = store.settings.codMinAmountMinor;
  entity.codMaxAmountMinor = store.settings.codMaxAmountMinor;
  entity.codReservationTtlHours = store.settings.codReservationTtlHours;
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
