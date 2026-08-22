import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  AccountDisabledError,
  AccountLockedError,
  AccountNotActiveError,
  InvalidUserStatusTransitionError,
} from '../errors/user.errors';
import type { Role } from '../enums/role.enum';
import { EmailAddress } from '../value-objects/email-address.value-object';

export type UserStatus = 'pending' | 'active' | 'locked' | 'disabled';

interface UserProps {
  email: EmailAddress;
  name: string;
  passwordHash: string;
  status: UserStatus;
  roles: readonly Role[];
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

const ALLOWED_TRANSITIONS: Record<UserStatus, UserStatus[]> = {
  pending: ['active', 'disabled'],
  active: ['locked', 'disabled'],
  locked: ['active', 'disabled'],
  disabled: [],
};

export class User extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: UserProps,
  ) {
    super(id);
  }

  public static register(
    email: string,
    name: string,
    passwordHash: string,
    roles: readonly Role[] = ['CUSTOMER'],
  ): User {
    const user = new User(UniqueID.create(), {
      email: EmailAddress.create(email),
      name: name.trim(),
      passwordHash,
      status: 'pending',
      roles,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    user.addEvent('UserRegistered', {
      userId: user.id.value,
      email: user.props.email.value,
    });
    return user;
  }

  public static rehydrate(
    id: string,
    email: string,
    name: string,
    passwordHash: string,
    status: UserStatus,
    roles: readonly Role[],
    failedLoginAttempts: number,
    lockedUntil: Date | null,
  ): User {
    return new User(UniqueID.from(id), {
      email: EmailAddress.create(email),
      name,
      passwordHash,
      status,
      roles,
      failedLoginAttempts,
      lockedUntil,
    });
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get email(): EmailAddress {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get roles(): readonly Role[] {
    return this.props.roles;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get failedLoginAttempts(): number {
    return this.props.failedLoginAttempts;
  }

  get lockedUntil(): Date | null {
    return this.props.lockedUntil;
  }

  public activate(): void {
    this.assertTransition('active');
    this.props = { ...this.props, status: 'active' };
    this.addEvent('UserActivated', { userId: this.id.value });
  }

  public lock(until: Date): void {
    this.assertTransition('locked');
    this.props = {
      ...this.props,
      status: 'locked',
      lockedUntil: until,
    };
    this.addEvent('UserLocked', { userId: this.id.value, lockedUntil: until.toISOString() });
  }

  public unlock(): void {
    this.assertTransition('active');
    this.props = {
      ...this.props,
      status: 'active',
      lockedUntil: null,
      failedLoginAttempts: 0,
    };
    this.addEvent('UserUnlocked', { userId: this.id.value });
  }

  public disable(): void {
    this.assertTransition('disabled');
    this.props = { ...this.props, status: 'disabled', lockedUntil: null };
    this.addEvent('UserDisabled', { userId: this.id.value });
  }

  public assertCanAuthenticate(now = new Date()): void {
    if (this.props.status === 'disabled') {
      throw new AccountDisabledError();
    }

    if (this.props.status === 'pending') {
      throw new AccountNotActiveError();
    }

    if (this.props.status === 'locked') {
      if (this.props.lockedUntil !== null && this.props.lockedUntil > now) {
        throw new AccountLockedError();
      }

      this.unlock();
    }
  }

  public recordFailedLogin(maxAttempts: number, lockDurationMs: number, now = new Date()): void {
    const attempts = this.props.failedLoginAttempts + 1;

    if (attempts >= maxAttempts) {
      const lockedUntil = new Date(now.getTime() + lockDurationMs);
      this.props = {
        ...this.props,
        failedLoginAttempts: attempts,
        status: 'locked',
        lockedUntil,
      };
      this.addEvent('UserLocked', {
        userId: this.id.value,
        lockedUntil: lockedUntil.toISOString(),
        reason: 'failed_login_threshold',
      });
      return;
    }

    this.props = { ...this.props, failedLoginAttempts: attempts };
  }

  public resetFailedLogins(): void {
    this.props = { ...this.props, failedLoginAttempts: 0, lockedUntil: null };
  }

  public changePassword(newPasswordHash: string): void {
    this.props = { ...this.props, passwordHash: newPasswordHash };
    this.addEvent('PasswordChanged', { userId: this.id.value });
  }

  public grantRoles(roles: readonly Role[]): void {
    const next = new Set<Role>(this.props.roles);
    for (const role of roles) {
      next.add(role);
    }
    this.props = { ...this.props, roles: [...next] };
    this.addEvent('UserRolesGranted', {
      userId: this.id.value,
      roles: [...roles],
    });
  }

  private assertTransition(target: UserStatus): void {
    const allowed = ALLOWED_TRANSITIONS[this.props.status];
    if (!allowed.includes(target)) {
      throw new InvalidUserStatusTransitionError(this.props.status, target);
    }
  }
}
