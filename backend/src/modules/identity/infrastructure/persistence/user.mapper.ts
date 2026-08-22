import { User } from '../../domain/aggregates/user.aggregate';
import { UserOrmEntity } from './user.orm-entity';

export function toOrmEntity(user: User, existing?: UserOrmEntity): UserOrmEntity {
  const entity = existing ?? new UserOrmEntity();
  entity.id = user.id.value;
  entity.email = user.email.value;
  entity.name = user.name;
  entity.passwordHash = user.passwordHash;
  entity.status = user.status;
  entity.roles = [...user.roles];
  entity.failedLoginAttempts = user.failedLoginAttempts;
  entity.lockedUntil = user.lockedUntil;
  if (!existing) {
    entity.createdAt = new Date();
  }
  entity.updatedAt = new Date();
  return entity;
}

export function toDomain(entity: UserOrmEntity): User {
  return User.rehydrate(
    entity.id,
    entity.email,
    entity.name,
    entity.passwordHash,
    entity.status,
    entity.roles,
    entity.failedLoginAttempts,
    entity.lockedUntil,
  );
}
