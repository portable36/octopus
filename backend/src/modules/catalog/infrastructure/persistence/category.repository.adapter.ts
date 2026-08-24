import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { CategoryRepository } from '../../application/ports/category-repository.interface';
import type { Category } from '../../domain/aggregates/category.aggregate';
import { applyCategoryToOrm, categoryToDomain } from './catalog.mappers';
import { CategoryOrmEntity } from './category.orm-entity';

@Injectable()
export class CategoryRepositoryAdapter implements CategoryRepository {
  constructor(private readonly em: EntityManager) {}

  public async save(category: Category): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(CategoryOrmEntity, { id: category.id.value });
      const entity = existing ?? new CategoryOrmEntity();
      applyCategoryToOrm(category, entity);
      await tx.persist(entity).flush();
    });
  }

  public async findById(id: string): Promise<Category | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(CategoryOrmEntity, { id });
      return entity ? categoryToDomain(entity) : null;
    });
  }

  public async findAll(): Promise<Category[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(CategoryOrmEntity, {});
      return entities.map(categoryToDomain);
    });
  }

  public async existsSiblingSlug(
    parentId: string | null,
    slug: string,
    excludeId?: string,
  ): Promise<boolean> {
    return withRlsContext(this.em, async (tx) => {
      const where: Record<string, unknown> = { parentId, slug };
      if (excludeId) {
        where.id = { $ne: excludeId };
      }
      const count = await tx.count(CategoryOrmEntity, where);
      return count > 0;
    });
  }

  public async findAncestorIds(categoryId: string): Promise<string[]> {
    return withRlsContext(this.em, async (tx) => {
      const ancestors: string[] = [];
      let current = await tx.findOne(CategoryOrmEntity, { id: categoryId });
      const seen = new Set<string>();
      while (current?.parentId) {
        if (seen.has(current.parentId)) {
          break;
        }
        seen.add(current.parentId);
        ancestors.push(current.parentId);
        current = await tx.findOne(CategoryOrmEntity, { id: current.parentId });
      }
      return ancestors;
    });
  }
}
