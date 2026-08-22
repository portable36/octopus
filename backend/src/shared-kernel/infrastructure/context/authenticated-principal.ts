export interface AuthenticatedPrincipal {
  readonly userId: string;
  readonly email: string;
  readonly roles: readonly string[];
}

export function isPlatformAdmin(roles: readonly string[]): boolean {
  return roles.includes('PLATFORM_ADMIN');
}
