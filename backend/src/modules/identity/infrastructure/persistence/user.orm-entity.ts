import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import type { Role } from '../../domain/enums/role.enum';
import type { UserStatus } from '../../domain/aggregates/user.aggregate';

@Entity({ tableName: 'users' })
export class UserOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ unique: true, type: 'string', length: 320 })
  email!: string;

  @Property({ type: 'string', length: 120 })
  name!: string;

  @Property({ fieldName: 'password_hash', type: 'string', length: 255 })
  passwordHash!: string;

  @Property({ type: 'string', length: 32 })
  status!: UserStatus;

  @Property({ type: 'json' })
  roles!: Role[];

  @Property({ fieldName: 'failed_login_attempts', type: 'integer', default: 0 })
  failedLoginAttempts!: number;

  @Property({ fieldName: 'locked_until', type: 'Date', nullable: true })
  lockedUntil: Date | null = null;

  @Property({ fieldName: 'mfa_enabled', type: 'boolean', default: false })
  mfaEnabled!: boolean;

  @Property({ fieldName: 'mfa_secret_cipher', nullable: true, type: 'text' })
  mfaSecretCipher: string | null = null;

  @Property({ fieldName: 'created_at', type: 'Date' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at', type: 'Date', onUpdate: () => new Date() })
  updatedAt!: Date;
}
