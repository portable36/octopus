import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  AccessTokenPayload,
  TokenSigner,
} from '../../application/ports/token-signer.interface';
import type { Role } from '../../domain/enums/role.enum';
import { isRole } from '../../domain/enums/role.enum';
import { ExpiredAccessTokenError } from '../../application/errors/identity.errors';

interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  type: 'access';
}

@Injectable()
export class JwtTokenSignerAdapter implements TokenSigner {
  constructor(private readonly jwtService: JwtService) {}

  public async signAccess(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync({
      sub: payload.sub,
      email: payload.email,
      roles: payload.roles,
      type: 'access',
    });
  }

  public async verifyAccess(token: string): Promise<AccessTokenPayload> {
    try {
      const decoded = await this.jwtService.verifyAsync<JwtPayload>(token);
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type.');
      }

      const roles = decoded.roles.filter(isRole);
      return {
        sub: decoded.sub,
        email: decoded.email,
        roles: roles as Role[],
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new ExpiredAccessTokenError();
      }
      throw error;
    }
  }
}
