import { Inject, Injectable } from '@nestjs/common';
import type { UserDirectory } from '../../../../shared-kernel/application/ports/user-directory.port';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../application/ports/user-repository.interface';

@Injectable()
export class UserDirectoryAdapter implements UserDirectory {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  public async existsById(userId: string): Promise<boolean> {
    return (await this.users.findById(userId)) !== null;
  }
}
