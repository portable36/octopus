import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExpiredAccessTokenError } from '../../../application/errors/identity.errors';
import { TOKEN_SIGNER, type TokenSigner } from '../../../application/ports/token-signer.interface';
import { IS_PUBLIC_KEY } from '../../../../../shared-kernel/presentation/http/public.decorator';
import { setAuthenticatedPrincipal } from '../../../../../shared-kernel/infrastructure/context/tenant-context.storage';
import type { AuthenticatedRequest } from '../types/authenticated-request';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SIGNER) private readonly tokenSigner: TokenSigner,
    private readonly reflector: Reflector,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    const token = authorization.slice('Bearer '.length).trim();
    try {
      const payload = await this.tokenSigner.verifyAccess(token);
      request.user = {
        userId: payload.sub,
        email: payload.email,
        roles: payload.roles,
      };
      setAuthenticatedPrincipal({
        userId: payload.sub,
        email: payload.email,
        roles: payload.roles,
      });
      return true;
    } catch (error) {
      if (error instanceof ExpiredAccessTokenError) {
        throw new UnauthorizedException('Access token expired.');
      }
      throw new UnauthorizedException('Invalid access token.');
    }
  }
}
