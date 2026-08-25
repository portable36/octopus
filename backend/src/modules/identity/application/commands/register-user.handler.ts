import { Inject, Injectable } from '@nestjs/common';
import {
  NOTIFICATION_PORT,
  type NotificationPort,
} from '../../../../shared-kernel/application/ports/notification.port';
import { PasswordPolicy } from '../../domain/value-objects/password-policy.value-object';
import { UserAlreadyExistsError } from '../errors/identity.errors';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.interface';
import { USER_REPOSITORY, type UserRepository } from '../ports/user-repository.interface';
import { AuthSessionService } from '../services/auth-session.service';
import { User } from '../../domain/aggregates/user.aggregate';
import type { Role } from '../../domain/enums/role.enum';
import type { AuthSession } from '../dto/auth-session.dto';

export interface RegisterUserCommand {
  readonly email: string;
  readonly name: string;
  readonly password: string;
  readonly roles?: readonly Role[];
}

@Injectable()
export class RegisterUserHandler {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    private readonly authSession: AuthSessionService,
    @Inject(NOTIFICATION_PORT) private readonly notifications: NotificationPort,
  ) {}

  public async execute(command: RegisterUserCommand): Promise<AuthSession> {
    PasswordPolicy.validate(command.password);

    if (await this.users.existsByEmail(command.email)) {
      throw new UserAlreadyExistsError();
    }

    const passwordHash = await this.passwordHasher.hash(command.password);
    const user = User.register(command.email, command.name, passwordHash, command.roles);
    user.activate();

    await this.users.save(user);

    // ponytail: identity has no outbox yet — notify inline after user persist.
    await this.notifications.notify({
      eventId: `notify:welcome:${user.id.value}`,
      recipientUserId: user.id.value,
      recipientEmail: user.email.value,
      type: 'account.welcome',
      templateKey: 'account.welcome',
      category: 'TRANSACTIONAL',
      channels: ['IN_APP', 'EMAIL'],
      data: { name: user.name },
    });

    return this.authSession.issueSession(user);
  }
}
