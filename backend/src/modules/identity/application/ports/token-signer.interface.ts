import type { Role } from '../../domain/enums/role.enum';

export interface AccessTokenPayload {
  readonly sub: string;
  readonly email: string;
  readonly roles: readonly Role[];
  readonly mfaEnabled: boolean;
}

export const TOKEN_SIGNER = Symbol('TOKEN_SIGNER');

export interface TokenSigner {
  signAccess(payload: AccessTokenPayload): Promise<string>;
  verifyAccess(token: string): Promise<AccessTokenPayload>;
}
