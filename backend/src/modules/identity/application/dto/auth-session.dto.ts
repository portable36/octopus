import type { Role } from '../../domain/enums/role.enum';

export interface AuthPrincipal {
  readonly userId: string;
  readonly email: string;
  readonly roles: readonly Role[];
  readonly mfaEnabled: boolean;
}

export interface AuthSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresInSeconds: number;
  readonly user: AuthPrincipal;
}
