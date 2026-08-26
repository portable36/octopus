import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenRoleError } from '../errors/identity.errors';
import { USER_REPOSITORY, type UserRepository } from '../ports/user-repository.interface';
import type { User } from '../../domain/aggregates/user.aggregate';

@Injectable()
export class ListUsersHandler {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  public async listRecentForPlatform(input: {
    readonly actorRoles: readonly string[];
    readonly limit?: number;
  }): Promise<User[]> {
    if (!input.actorRoles.includes('PLATFORM_ADMIN')) {
      throw new ForbiddenRoleError();
    }
    return this.users.listRecent(input.limit ?? 50);
  }
}
