import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import type { Role } from '../../domain/enums/role.enum';
import type { UserStatus } from '../../domain/aggregates/user.aggregate';

@Entity({ tableName: 'users' })
export class UserOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ unique: true })
  email!: string;

  @Property()
  name!: string;

  @Property({ fieldName: 'password_hash' })
  passwordHash!: string;

  @Property()
  status!: UserStatus;

  @Property({ type: 'json' })
  roles!: Role[];

  @Property({ fieldName: 'failed_login_attempts', default: 0 })
  failedLoginAttempts!: number;

  @Property({ fieldName: 'locked_until', nullable: true })
  lockedUntil: Date | null = null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt!: Date;
}
