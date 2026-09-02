import { randomUUID } from 'node:crypto';
import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type {
  SeoOverrideRepository,
  UpsertSeoOverrideInput,
} from '../../application/ports/seo-override-repository.interface';
import type { SeoOverrideEntityType } from '../../domain/seo-override.types';
import { SeoOverride } from '../entities/seo-override.entity';

@Injectable()
export class SeoOverrideRepositoryAdapter implements SeoOverrideRepository {
  constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

  public async findByEntity(entityType: SeoOverrideEntityType, entityId: string) {
    const entity = await this.em.findOne(
      SeoOverride,
      { entityType, entityId },
      {
        fields: ['title', 'description', 'noindex', 'canonicalUrl'],
      },
    );
    if (!entity) {
      return null;
    }
    return {
      title: entity.title,
      description: entity.description,
      noindex: entity.noindex,
      canonicalUrl: entity.canonicalUrl,
    };
  }

  public async upsert(input: UpsertSeoOverrideInput) {
    const now = new Date();
    let entity = await this.em.findOne(SeoOverride, {
      entityType: input.entityType,
      entityId: input.entityId,
    });

    if (!entity) {
      entity = this.em.create(SeoOverride, {
        id: randomUUID(),
        entityType: input.entityType,
        entityId: input.entityId,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (input.title !== undefined) {
      entity.title = input.title;
    }
    if (input.description !== undefined) {
      entity.description = input.description;
    }
    if (input.noindex !== undefined) {
      entity.noindex = input.noindex;
    }
    if (input.canonicalUrl !== undefined) {
      entity.canonicalUrl = input.canonicalUrl;
    }
    entity.updatedAt = now;

    await this.em.persistAndFlush(entity);

    return {
      title: entity.title,
      description: entity.description,
      noindex: entity.noindex,
      canonicalUrl: entity.canonicalUrl,
    };
  }

  public async countMissingMetadata(): Promise<number> {
    const rows = (await this.em.getConnection().execute(
      `select count(*)::int as count
       from seo_overrides
       where title is null and description is null`,
    )) as Array<{ count: number }>;
    return rows[0]?.count ?? 0;
  }
}
