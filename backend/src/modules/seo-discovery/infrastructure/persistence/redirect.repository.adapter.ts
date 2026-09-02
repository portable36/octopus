import { randomUUID } from 'node:crypto';
import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type {
  RedirectRepository,
  UpsertRedirectInput,
} from '../../application/ports/redirect-repository.interface';
import type { RedirectRule } from '../../domain/seo.types';
import { normalizeRequestPath } from '../../domain/normalize-path';
import { Redirect } from '../entities/redirect.entity';

function toRule(entity: Pick<Redirect, 'sourceUrl' | 'targetUrl' | 'statusCode'>): RedirectRule {
  return {
    sourceUrl: entity.sourceUrl,
    targetUrl: entity.targetUrl ?? '',
    statusCode: entity.statusCode,
  };
}

@Injectable()
export class RedirectRepositoryAdapter implements RedirectRepository {
  constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

  public async findBySourcePath(sourcePath: string): Promise<RedirectRule | null> {
    const entity = await this.em.findOne(
      Redirect,
      { sourceUrl: sourcePath },
      { fields: ['sourceUrl', 'targetUrl', 'statusCode'] },
    );
    if (!entity) {
      return null;
    }
    return toRule(entity);
  }

  public async upsert(input: UpsertRedirectInput): Promise<RedirectRule> {
    await this.bulkUpsert([input]);
    const found = await this.findBySourcePath(normalizeRequestPath(input.sourcePath));
    if (!found) {
      throw new Error('Redirect upsert failed');
    }
    return found;
  }

  public async bulkUpsert(inputs: readonly UpsertRedirectInput[]): Promise<number> {
    if (inputs.length === 0) {
      return 0;
    }

    const now = new Date();
    let written = 0;

    await this.em.transactional(async (em) => {
      for (const input of inputs) {
        const sourceUrl = normalizeRequestPath(input.sourcePath);
        let entity = await em.findOne(Redirect, { sourceUrl });

        if (!entity) {
          entity = em.create(Redirect, {
            id: randomUUID(),
            sourceUrl,
            createdAt: now,
            updatedAt: now,
            statusCode: input.statusCode,
            targetUrl: input.targetPath ?? null,
          });
        } else {
          entity.statusCode = input.statusCode;
          entity.targetUrl = input.targetPath ?? null;
          entity.updatedAt = now;
        }

        em.persist(entity);
        written += 1;
      }
    });

    return written;
  }

  public async countBroken(): Promise<number> {
    const rows = (await this.em.getConnection().execute(
      `select count(*)::int as count
       from seo_redirects
       where status_code in (301, 302)
         and (target_path is null or btrim(target_path) = '')`,
    )) as Array<{ count: number }>;
    return rows[0]?.count ?? 0;
  }
}
