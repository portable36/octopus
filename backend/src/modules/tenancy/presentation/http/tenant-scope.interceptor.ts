import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { ResolveScopeHandler } from '../../application/commands/resolve-scope.handler';
import { TenancyScopeError } from '../../domain/scope.types';

interface ScopedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    roles: readonly string[];
  };
  scope?: unknown;
}

/**
 * Resolves vendor/store/platform scope after authentication.
 * Scope headers are advisory only and are always re-validated against memberships.
 */
@Injectable()
export class TenantScopeInterceptor implements NestInterceptor {
  constructor(private readonly resolveScope: ResolveScopeHandler) {}

  public async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<ScopedRequest>();

    if (!request.user) {
      return next.handle();
    }

    const requestedVendorId = this.readHeader(request, 'x-vendor-id');
    const requestedStoreId = this.readHeader(request, 'x-store-id');
    const requestPlatformScope = this.readHeader(request, 'x-platform-scope') === 'true';

    try {
      const scope = await this.resolveScope.execute({
        userId: request.user.userId,
        roles: request.user.roles,
        ...(requestedVendorId ? { requestedVendorId } : {}),
        ...(requestedStoreId ? { requestedStoreId } : {}),
        ...(requestPlatformScope ? { requestPlatformScope } : {}),
      });
      request.scope = scope;
    } catch (error) {
      if (error instanceof TenancyScopeError) {
        throw new ForbiddenException({ message: error.message, code: error.code });
      }
      throw error;
    }

    return next.handle();
  }

  private readHeader(request: ScopedRequest, name: string): string | undefined {
    const value = request.headers[name];
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
}
