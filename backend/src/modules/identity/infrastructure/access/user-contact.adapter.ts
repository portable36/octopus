import { Inject, Injectable } from '@nestjs/common';
import type { UserContactPort } from '../../../../shared-kernel/application/ports/user-contact.port';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../application/ports/user-repository.interface';

@Injectable()
export class UserContactAdapter implements UserContactPort {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  public async findEmailByUserId(userId: string): Promise<string | null> {
    const user = await this.users.findById(userId);
    return user?.email.value ?? null;
  }
}
