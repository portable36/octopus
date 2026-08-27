import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Declares required permissions for PermissionsGuard (global APP_GUARD).
 * Prefer platform.* for /admin platform-only lists so vendor roles with shared
 * domain permissions (e.g. order.read) cannot pass the HTTP gate.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
