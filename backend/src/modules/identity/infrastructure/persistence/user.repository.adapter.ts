import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type { UserRepository } from '../../application/ports/user-repository.interface';
import type { User } from '../../domain/aggregates/user.aggregate';
import { UserOrmEntity } from './user.orm-entity';
import { toDomain, toOrmEntity } from './user.mapper';

@Injectable()
export class UserRepositoryAdapter implements UserRepository {
  constructor(private readonly em: EntityManager) {}

  public async save(user: User): Promise<void> {
    const existing = await this.em.findOne(UserOrmEntity, { id: user.id.value });
    const entity = toOrmEntity(user, existing ?? undefined);
    await this.em.persist(entity).flush();
  }

  public async findById(id: string): Promise<User | null> {
    const entity = await this.em.findOne(UserOrmEntity, { id });
    return entity ? toDomain(entity) : null;
  }

  public async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    const entity = await this.em.findOne(UserOrmEntity, { email: normalized });
    return entity ? toDomain(entity) : null;
  }

  public async existsByEmail(email: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    const count = await this.em.count(UserOrmEntity, { email: normalized });
    return count > 0;
  }
}
