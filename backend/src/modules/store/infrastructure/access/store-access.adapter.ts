import { Inject, Injectable } from '@nestjs/common';
import type {
  StoreAccessPort,
  StoreAccessSnapshot,
} from '../../../../shared-kernel/application/ports/store-access.port';
import {
  STORE_REPOSITORY,
  type StoreRepository,
} from '../../application/ports/store-repository.interface';

@Injectable()
export class StoreAccessAdapter implements StoreAccessPort {
  constructor(@Inject(STORE_REPOSITORY) private readonly stores: StoreRepository) {}

  public async findById(storeId: string): Promise<StoreAccessSnapshot | null> {
    const store = await this.stores.findById(storeId);
    if (!store) {
      return null;
    }
    return {
      storeId: store.id.value,
      vendorId: store.vendorId,
      status: store.status,
      displayName: store.profile.displayName,
      locale: store.settings.locale,
      currencyCode: store.settings.currencyCode,
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
}
