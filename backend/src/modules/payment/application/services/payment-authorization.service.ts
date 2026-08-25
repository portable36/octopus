import { Inject, Injectable } from '@nestjs/common';
import {
  STORE_ACCESS,
  type StoreAccessPort,
} from '../../../../shared-kernel/application/ports/store-access.port';
import {
  VENDOR_ACCESS,
  type VendorAccessPort,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
import type { PaymentIntent } from '../../domain/aggregates/payment-intent.aggregate';
import { PaymentAccessDeniedError } from '../errors/payment.errors';

/** Mirrors identity RBAC (avoid cross-module import). */
const COD_COLLECT_ROLES = new Set(['PLATFORM_ADMIN', 'VENDOR_OWNER', 'STORE_MANAGER']);
const REFUND_CREATE_ROLES = new Set(['PLATFORM_ADMIN', 'VENDOR_OWNER', 'STORE_MANAGER']);

@Injectable()
export class PaymentAuthorizationService {
  constructor(
    @Inject(STORE_ACCESS) private readonly stores: StoreAccessPort,
    @Inject(VENDOR_ACCESS) private readonly vendors: VendorAccessPort,
  ) {}

  public async requireCodCollector(
    intent: PaymentIntent,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<void> {
    await this.requireStoreScopedRole(
      intent,
      actorUserId,
      actorRoles,
      COD_COLLECT_ROLES,
      'Missing permission payment.cod.collect.',
    );
  }

  public async requireRefundCreator(
    intent: PaymentIntent,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<void> {
    await this.requireStoreScopedRole(
      intent,
      actorUserId,
      actorRoles,
      REFUND_CREATE_ROLES,
      'Missing permission payment.refund.create.',
    );
  }

  private async requireStoreScopedRole(
    intent: PaymentIntent,
    actorUserId: string,
    actorRoles: readonly string[],
    allowedRoles: ReadonlySet<string>,
    missingPermissionMessage: string,
  ): Promise<void> {
    if (!actorRoles.some((role) => allowedRoles.has(role))) {
      throw new PaymentAccessDeniedError(missingPermissionMessage);
    }
    if (actorRoles.includes('PLATFORM_ADMIN')) {
      return;
    }

    const store = await this.stores.findById(intent.storeId);
    if (store?.managerUserIds.includes(actorUserId)) {
      return;
    }

    const vendor = await this.vendors.findById(intent.vendorId);
    if (vendor && vendor.ownerUserId === actorUserId) {
      return;
    }

    throw new PaymentAccessDeniedError();
  }
}
