export const USER_ROLE_ASSIGNER = Symbol('USER_ROLE_ASSIGNER');

export interface UserRoleAssigner {
  /** Ensures the listed roles are present on the user (union with existing roles). */
  ensureRoles(userId: string, roles: readonly string[]): Promise<void>;
}
