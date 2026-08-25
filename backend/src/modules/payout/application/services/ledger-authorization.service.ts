import { Inject, Injectable } from '@nestjs/common';
import {
  STORE_ACCESS,
  type StoreAccessPort,
} from '../../../../shared-kernel/application/ports/store-access.port';
import {
  VENDOR_ACCESS,
  type VendorAccessPort,
} from '../../../../shared-kernel/application/ports/vendor-access.port';

const LEDGER_READ_ROLES = new Set(['PLATFORM_ADMIN', 'VENDOR_OWNER']);

export class LedgerAccessDeniedError extends Error {
  readonly code = 'LEDGER_ACCESS_DENIED';
  constructor(message = 'Not authorized to read vendor ledger.') {
    super(message);
    this.name = 'LedgerAccessDeniedError';
  }
}

@Injectable()
export class LedgerAuthorizationService {
  constructor(
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
    @Inject(STORE_ACCESS) private readonly stores: StoreAccessPort,
  ) {}

  public async requireLedgerReader(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<void> {
    if (!actorRoles.some((role) => LEDGER_READ_ROLES.has(role))) {
      throw new LedgerAccessDeniedError('Missing permission finance.ledger.read.');
    }
    if (actorRoles.includes('PLATFORM_ADMIN')) {
      return;
    }
    const vendor = await this.vendors.findById(vendorId);
    if (vendor && vendor.ownerUserId === actorUserId) {
      return;
    }
    void this.stores;
    throw new LedgerAccessDeniedError();
  }

  public requirePlatformAdjuster(actorRoles: readonly string[]): void {
    if (!actorRoles.includes('PLATFORM_ADMIN')) {
      throw new LedgerAccessDeniedError('Missing permission finance.ledger.adjust.');
    }
  }

  public requirePlatformReconciler(actorRoles: readonly string[]): void {
    if (!actorRoles.includes('PLATFORM_ADMIN')) {
      throw new LedgerAccessDeniedError('Missing permission finance.ledger.reconcile.');
    }
  }

  public async requireStoreOnVendor(vendorId: string, storeId: string): Promise<void> {
    const store = await this.stores.findById(storeId);
    if (!store || store.vendorId !== vendorId) {
      throw new LedgerAccessDeniedError('Store does not belong to vendor.');
    }
  }
}
