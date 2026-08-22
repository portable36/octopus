import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueId } from '../../../../shared-kernel/domain/unique-id.value-object';
import { EmailAddress } from '../value-objects/email-address.value-object';

export type UserRole = 'PLATFORM_ADMIN' | 'VENDOR_OWNER' | 'VENDOR_STAFF' | 'STORE_MANAGER' | 'STORE_STAFF' | 'CUSTOMER';
export type UserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';

interface UserProps {
  email: EmailAddress;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  vendorId?: UniqueId;
  storeId?: UniqueId;
}

export class User extends AggregateRoot {
  private props: UserProps;

  private constructor(props: UserProps, id?: UniqueId) {
    super(id);
    this.props = props;
  }

  public static create(props: Omit<UserProps, 'status'>, id?: UniqueId): User {
    // Business validation rule (Invariant)
    if (props.role !== 'PLATFORM_ADMIN' && props.role !== 'CUSTOMER' && !props.vendorId) {
      throw new Error('Vendor-specific roles must have an associated vendorId');
    }

    return new User({
      ...props,
      status: 'PENDING_VERIFICATION'
    }, id);
  }

  get email(): EmailAddress { return this.props.email; }
  get role(): UserRole { return this.props.role; }
  get status(): UserStatus { return this.props.status; }
  get vendorId(): UniqueId | undefined { return this.props.vendorId; }
  get storeId(): UniqueId | undefined { return this.props.storeId; }

  public activate(): void {
    this.props.status = 'ACTIVE';
    this.addDomainEvent({ name: 'UserActivated', userId: this.id.toString() });
  }

  public suspend(): void {
    this.props.status = 'SUSPENDED';
  }
}
