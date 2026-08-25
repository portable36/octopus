import { Inject, Injectable } from '@nestjs/common';
import type {
  StoreAccessPort,
  StoreAccessSnapshot,
} from '../../../../shared-kernel/application/ports/store-access.port';
import type { Store } from '../../domain/aggregates/store.aggregate';
import {
  STORE_REPOSITORY,
  type StoreRepository,
} from '../../application/ports/store-repository.interface';

@Injectable()
export class StoreAccessAdapter implements StoreAccessPort {
  constructor(@Inject(STORE_REPOSITORY) private readonly stores: StoreRepository) {}

  public async findById(storeId: string): Promise<StoreAccessSnapshot | null> {
    const store = await this.stores.findById(storeId);
    return store ? toSnapshot(store) : null;
  }

  public async findActiveBySlug(
    slug: string,
    vendorId?: string,
  ): Promise<StoreAccessSnapshot | null> {
    const store = await this.stores.findActiveBySlug(slug, vendorId);
    return store ? toSnapshot(store) : null;
  }
}

function toSnapshot(store: Store): StoreAccessSnapshot {
  return {
    storeId: store.id.value,
    vendorId: store.vendorId,
    status: store.status,
    displayName: store.profile.displayName,
    slug: store.profile.slug,
    description: store.profile.description,
    locale: store.settings.locale,
    currencyCode: store.settings.currencyCode,
    acceptsOnlineOrders: store.settings.acceptsOnlineOrders,
    addressLine1: store.address.line1,
    city: store.address.city,
    region: store.address.region,
    managerUserIds: store.staff
      .filter((member) => member.role === 'STORE_MANAGER')
      .map((member) => member.userId),
    staffUserIds: store.staff.map((member) => member.userId),
    codEnabled: store.settings.codEnabled,
    codMinAmountMinor: store.settings.codMinAmountMinor,
    codMaxAmountMinor: store.settings.codMaxAmountMinor,
    codReservationTtlHours: store.settings.codReservationTtlHours,
  };
}
