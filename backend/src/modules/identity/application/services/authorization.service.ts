import { Injectable } from '@nestjs/common';
import { PERMISSIONS, type Permission } from '../../domain/enums/permission.enum';
import type { Role } from '../../domain/enums/role.enum';
import {
  permissionsForRoles,
  roleHasPermission,
} from '../../domain/policies/role-permissions.policy';
import { ForbiddenPermissionError, ForbiddenRoleError } from '../errors/identity.errors';

@Injectable()
export class AuthorizationService {
  public hasPermission(roles: readonly Role[], permission: Permission): boolean {
    return roleHasPermission(roles, permission);
  }

  public listPermissions(roles: readonly Role[]): readonly Permission[] {
    if (roles.includes('PLATFORM_ADMIN')) {
      return [...PERMISSIONS];
    }
    return [...permissionsForRoles(roles)];
  }

  public assertPermission(roles: readonly Role[], permission: Permission): void {
    if (!this.hasPermission(roles, permission)) {
      throw new ForbiddenPermissionError();
    }
  }

  public assertAnyRole(roles: readonly Role[], allowedRoles: readonly Role[]): void {
    const allowed = new Set<Role>(allowedRoles);
    if (!roles.some((role) => allowed.has(role))) {
      throw new ForbiddenRoleError();
    }
  }
}
