import { Inject, Injectable } from '@nestjs/common';
import type { UserRoleAssigner } from '../../../../shared-kernel/application/ports/user-role-assigner.port';
import { isRole, type Role } from '../../domain/enums/role.enum';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../application/ports/user-repository.interface';

@Injectable()
export class UserRoleAssignerAdapter implements UserRoleAssigner {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  public async ensureRoles(userId: string, roles: readonly string[]): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      return;
    }

    const toGrant = roles.filter(isRole) as Role[];
    if (toGrant.length === 0) {
      return;
    }

    const missing = toGrant.filter((role) => !user.roles.includes(role));
    if (missing.length === 0) {
      return;
    }

    user.grantRoles(missing);
    await this.users.save(user);
  }
}
