import { Inject, Injectable } from '@nestjs/common';
import {
  clearVendorStoreScope,
  setPlatformScope,
  setStoreScope,
  setTenantScope,
  setVendorScope,
} from '../../../../shared-kernel/infrastructure/context/tenant-context.storage';
import {
  assertCustomerCannotAccessVendorResources,
  resolveActorScope,
} from '../../domain/scope-policy';
import type { ActorMembership, ResolvedScope } from '../../domain/scope.types';
import {
  MEMBERSHIP_DIRECTORY,
  type MembershipDirectory,
} from '../ports/membership-directory.interface';

export interface ResolveScopeCommand {
  readonly userId: string;
  readonly roles: readonly string[];
  readonly requestedVendorId?: string;
  readonly requestedStoreId?: string;
  readonly requestPlatformScope?: boolean;
}

@Injectable()
export class ResolveScopeHandler {
  constructor(
    @Inject(MEMBERSHIP_DIRECTORY) private readonly membershipDirectory: MembershipDirectory,
  ) {}

  public async execute(command: ResolveScopeCommand): Promise<ResolvedScope> {
    const membershipRecord = await this.membershipDirectory.findByUserId(command.userId);
    const membership: ActorMembership = {
      userId: command.userId,
      roles: command.roles,
      storeIds: membershipRecord?.storeIds ?? [],
      ...(membershipRecord?.vendorId ? { vendorId: membershipRecord.vendorId } : {}),
    };

    if (
      command.requestedVendorId ||
      command.requestedStoreId ||
      command.requestPlatformScope === true
    ) {
      assertCustomerCannotAccessVendorResources(command.roles);
    }

    const scope = resolveActorScope({
      membership,
      ...(command.requestedVendorId ? { requestedVendorId: command.requestedVendorId } : {}),
      ...(command.requestedStoreId ? { requestedStoreId: command.requestedStoreId } : {}),
      ...(command.requestPlatformScope === true
        ? { requestPlatformScope: command.requestPlatformScope }
        : {}),
    });

    this.applyToRequestContext(scope);
    return scope;
  }

  private applyToRequestContext(scope: ResolvedScope): void {
    clearVendorStoreScope();

    if (scope.platformScope) {
      setPlatformScope(true);
      return;
    }

    setPlatformScope(false);

    if (scope.vendorId) {
      setVendorScope(scope.vendorId, scope.tenantId ?? scope.vendorId);
    }

    if (scope.storeId) {
      setStoreScope(scope.storeId);
    }

    if (scope.tenantId) {
      setTenantScope(scope.tenantId);
    }
  }
}
