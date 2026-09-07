import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  STORE_ACCESS,
  type StoreAccessPort,
} from '../../../../shared-kernel/application/ports/store-access.port';
import {
  VENDOR_ACCESS,
  type VendorAccessPort,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { redactSecrets } from '../../domain/services/redact-secrets';
import { AuditAccessDeniedError } from '../errors/audit.errors';
import {
  AUDIT_REPOSITORY,
  type AuditFilterQuery,
  type AuditQueryResult,
  type AuditRepository,
} from '../ports/audit-repository.interface';

@Injectable()
export class AuditHandlers {
  constructor(
    @Inject(AUDIT_REPOSITORY) private readonly audits: AuditRepository,
    @Optional() @Inject(STORE_ACCESS) private readonly stores?: StoreAccessPort,
    @Optional() @Inject(VENDOR_ACCESS) private readonly vendors?: VendorAccessPort,
  ) {}

  public async append(input: {
    readonly actorUserId: string | null;
    readonly action: string;
    readonly resourceType: string;
    readonly resourceId?: string | null;
    readonly vendorId?: string | null;
    readonly storeId?: string | null;
    readonly requestId?: string | null;
    readonly before?: Record<string, unknown> | null;
    readonly after?: Record<string, unknown> | null;
    readonly metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    await this.audits.append({
      id: UniqueID.create().value,
      actorUserId: input.actorUserId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      vendorId: input.vendorId ?? null,
      storeId: input.storeId ?? null,
      requestId: input.requestId ?? null,
      before: redactSecrets(input.before),
      after: redactSecrets(input.after),
      metadata: redactSecrets(input.metadata),
      createdAt: new Date(),
    });
  }

  public async listRecent(actorRoles: readonly string[], limit = 50, actionPrefix?: string) {
    if (!actorRoles.includes('PLATFORM_ADMIN')) {
      throw new AuditAccessDeniedError('Missing permission audit.read.');
    }
    return this.audits.listRecent(Math.min(Math.max(limit, 1), 100), actionPrefix);
  }

  public async queryAdmin(
    actorRoles: readonly string[],
    filter: AuditFilterQuery,
  ): Promise<AuditQueryResult> {
    if (!actorRoles.includes('PLATFORM_ADMIN')) {
      throw new AuditAccessDeniedError('Missing permission audit.read.');
    }
    return this.audits.query(filter);
  }

  public async queryStoreActivity(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    filter: Omit<AuditFilterQuery, 'storeId' | 'vendorId'> = {},
  ): Promise<AuditQueryResult> {
    if (!actorRoles.includes('PLATFORM_ADMIN')) {
      const store = await this.stores?.findById(storeId);
      if (!store) {
        throw new AuditAccessDeniedError('Not authorized for this store activity.');
      }
      const isStoreStaff =
        store.managerUserIds.includes(actorUserId) || store.staffUserIds.includes(actorUserId);
      if (!isStoreStaff) {
        const vendor = await this.vendors?.findById(store.vendorId);
        const isVendorStaff =
          vendor &&
          (vendor.ownerUserId === actorUserId || vendor.staffUserIds.includes(actorUserId));
        if (!isVendorStaff) {
          throw new AuditAccessDeniedError('Not authorized for this store activity.');
        }
      }
    }
    return this.audits.query({ ...filter, storeId });
  }

  public async queryVendorActivity(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    filter: Omit<AuditFilterQuery, 'vendorId'> = {},
  ): Promise<AuditQueryResult> {
    if (!actorRoles.includes('PLATFORM_ADMIN')) {
      const vendor = await this.vendors?.findById(vendorId);
      if (
        !vendor ||
        (vendor.ownerUserId !== actorUserId && !vendor.staffUserIds.includes(actorUserId))
      ) {
        throw new AuditAccessDeniedError('Not authorized for this vendor activity.');
      }
    }
    return this.audits.query({ ...filter, vendorId });
  }
}
