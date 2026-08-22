import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { EmailAddress } from '../value-objects/email-address.value-object';

export type UserStatus = 'active' | 'suspended' | 'deactivated';

interface UserProps {
  email: EmailAddress;
  name: string;
  status: UserStatus;
}

const ALLOWED_TRANSITIONS: Record<UserStatus, UserStatus[]> = {
  active: ['suspended', 'deactivated'],
  suspended: ['active'],
  deactivated: [],
};

export class User extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: UserProps,
  ) {
    super(id);
  }

  public static register(email: string, name: string): User {
    const user = new User(UniqueID.create(), {
      email: EmailAddress.create(email),
      name: name.trim(),
      status: 'active',
    });
    user.addEvent('UserRegistered', {
      userId: user.id.value,
      email: user.props.email.value,
    });
    return user;
  }

  public static rehydrate(id: string, email: string, name: string, status: UserStatus): User {
    return new User(UniqueID.from(id), {
      email: EmailAddress.create(email),
      name,
      status,
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

  public suspend(): void {
    this.assertTransition('suspended');
    this.props = { ...this.props, status: 'suspended' };
    this.addEvent('UserSuspended', { userId: this.id.value });
  }

  public reactivate(): void {
    this.assertTransition('active');
    this.props = { ...this.props, status: 'active' };
    this.addEvent('UserReactivated', { userId: this.id.value });
  }

  public deactivate(): void {
    this.assertTransition('deactivated');
    this.props = { ...this.props, status: 'deactivated' };
    this.addEvent('UserDeactivated', { userId: this.id.value });
  }

  private assertTransition(target: UserStatus): void {
    const allowed = ALLOWED_TRANSITIONS[this.props.status];
    if (!allowed.includes(target)) {
      throw new Error(`Invalid status transition: ${this.props.status} -> ${target}.`);
    }
  }
}
