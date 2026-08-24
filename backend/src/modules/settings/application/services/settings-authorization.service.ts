import { Injectable } from '@nestjs/common';
import { SettingsAccessDeniedError } from '../errors/settings.errors';
import type { ConfigurationScope } from '../../domain/settings.types';

/**
 * Scope checks only — permission strings are enforced by PermissionsGuard at the HTTP boundary.
 * Store managers may only write their own store (IDOR harness for Phase 20.3 branding).
 */
@Injectable()
export class SettingsAuthorizationService {
  public assertCanRead(
    roles: readonly string[],
    scope: ConfigurationScope,
    actorVendorId: string | null,
    actorStoreIds: readonly string[],
  ): void {
    this.assertScopeAccess(roles, scope, actorVendorId, actorStoreIds, 'read');
  }

  public assertCanWrite(
    roles: readonly string[],
    scope: ConfigurationScope,
    actorVendorId: string | null,
    actorStoreIds: readonly string[],
  ): void {
    this.assertScopeAccess(roles, scope, actorVendorId, actorStoreIds, 'write');
  }

  private assertScopeAccess(
    roles: readonly string[],
    scope: ConfigurationScope,
    actorVendorId: string | null,
    actorStoreIds: readonly string[],
    mode: 'read' | 'write',
  ): void {
    if (roles.includes('PLATFORM_ADMIN')) {
      return;
    }

    if (scope.kind === 'platform') {
      throw new SettingsAccessDeniedError(
        mode === 'write'
          ? 'Only platform admins can write platform settings.'
          : 'Only platform admins can read platform settings.',
      );
    }

    if (scope.kind === 'vendor') {
      if (actorVendorId !== scope.vendorId) {
        throw new SettingsAccessDeniedError();
      }
      if (mode === 'write' && !roles.includes('VENDOR_OWNER')) {
        throw new SettingsAccessDeniedError();
      }
      return;
    }

    if (!actorStoreIds.includes(scope.storeId)) {
      throw new SettingsAccessDeniedError('Store managers cannot modify another store’s settings.');
    }
    if (actorVendorId !== null && actorVendorId !== scope.vendorId) {
      throw new SettingsAccessDeniedError();
    }
  }
}
