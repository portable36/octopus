import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '../../../domain/enums/permission.enum';
import { AuthorizationService } from '../../../application/services/authorization.service';
import { ForbiddenPermissionError } from '../../../application/errors/identity.errors';
import type { AuthenticatedRequest } from '../types/authenticated-request';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly reflector: Reflector,
  ) {}

  public canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<readonly Permission[]>(PERMISSIONS_KEY, [
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
      for (const permission of required) {
        this.authorization.assertPermission(request.user.roles, permission);
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
