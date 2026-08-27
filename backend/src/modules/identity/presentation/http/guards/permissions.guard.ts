import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../../../../shared-kernel/presentation/http/require-permissions.decorator';
import { isPermission, type Permission } from '../../../domain/enums/permission.enum';
import { AuthorizationService } from '../../../application/services/authorization.service';
import { ForbiddenPermissionError } from '../../../application/errors/identity.errors';
import type { AuthenticatedRequest } from '../types/authenticated-request';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly reflector: Reflector,
  ) {}

  public canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<readonly string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new ForbiddenException('Authentication required.');
    }

    try {
      const needsPlatform = required.some((permission) => permission.startsWith('platform.'));
      if (
        needsPlatform &&
        request.user.roles.includes('PLATFORM_ADMIN') &&
        request.user.mfaEnabled !== true
      ) {
        throw new ForbiddenException({
          message: 'Enable MFA before using platform admin APIs.',
          code: 'MFA_ENROLLMENT_REQUIRED',
        });
      }

      for (const permission of required) {
        if (!isPermission(permission)) {
          throw new ForbiddenPermissionError();
        }
        this.authorization.assertPermission(request.user.roles, permission as Permission);
      }
      return true;
    } catch (error) {
      if (error instanceof ForbiddenPermissionError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }
}
