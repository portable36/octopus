import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { Vendor } from '../../domain/aggregates/vendor.aggregate';
import type { VendorStaffMember } from '../../domain/vendor.types';
import { VendorOrmEntity } from './vendor.orm-entity';
import { VendorStaffOrmEntity } from './vendor-staff.orm-entity';

export function toDomain(entity: VendorOrmEntity): Vendor {
  const staff: VendorStaffMember[] = entity.staff.getItems().map((member) => ({
    userId: member.userId,
    role: member.role,
    addedAt: member.addedAt,
  }));

  return Vendor.rehydrate({
    id: entity.id,
    profile: {
      displayName: entity.displayName,
      slug: entity.slug,
      description: entity.description,
    },
    business: {
      legalName: entity.legalName,
      registrationNumber: entity.registrationNumber,
      taxId: entity.taxId,
    },
    contact: {
      email: entity.contactEmail,
      phone: entity.contactPhone,
      addressLine: entity.addressLine,
      city: entity.city,
      countryCode: entity.countryCode,
    },
    settings: {
      currencyCode: entity.currencyCode,
      timezone: entity.timezone,
      acceptsOnlineOrders: entity.acceptsOnlineOrders,
      codEnabled: entity.codEnabled,
      codMinAmountMinor: entity.codMinAmountMinor,
      codMaxAmountMinor: entity.codMaxAmountMinor,
      codReservationTtlHours: entity.codReservationTtlHours,
    },
    status: entity.status,
    ownerUserId: entity.ownerUserId,
    staff,
    rejectionReason: entity.rejectionReason,
  });
}

export function applyToOrm(vendor: Vendor, entity: VendorOrmEntity): void {
  entity.id = vendor.id.value;
  entity.slug = vendor.profile.slug;
  entity.displayName = vendor.profile.displayName;
  entity.description = vendor.profile.description;
  entity.legalName = vendor.business.legalName;
  entity.registrationNumber = vendor.business.registrationNumber;
  entity.taxId = vendor.business.taxId;
  entity.contactEmail = vendor.contact.email;
  entity.contactPhone = vendor.contact.phone;
  entity.addressLine = vendor.contact.addressLine;
  entity.city = vendor.contact.city;
  entity.countryCode = vendor.contact.countryCode;
  entity.currencyCode = vendor.settings.currencyCode;
  entity.timezone = vendor.settings.timezone;
  entity.acceptsOnlineOrders = vendor.settings.acceptsOnlineOrders;
  entity.codEnabled = vendor.settings.codEnabled;
  entity.codMinAmountMinor = vendor.settings.codMinAmountMinor;
  entity.codMaxAmountMinor = vendor.settings.codMaxAmountMinor;
  entity.codReservationTtlHours = vendor.settings.codReservationTtlHours;
  entity.status = vendor.status;
  entity.ownerUserId = vendor.ownerUserId;
  entity.rejectionReason = vendor.rejectionReason;
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
  for (const member of vendor.staff) {
    const staffEntity = existingByUser.get(member.userId) ?? new VendorStaffOrmEntity();
    if (!staffEntity.id) {
      staffEntity.id = UniqueID.create().value;
    }
    staffEntity.userId = member.userId;
    staffEntity.role = member.role;
    staffEntity.addedAt = member.addedAt;
    staffEntity.vendor = entity;
    entity.staff.add(staffEntity);
  }
}
