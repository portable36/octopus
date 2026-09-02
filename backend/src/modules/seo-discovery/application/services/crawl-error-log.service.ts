import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import { CrawlErrorLog } from '../../infrastructure/entities/crawl-error-log.entity';
import { normalizeRequestPath } from '../../domain/normalize-path';

@Injectable()
export class CrawlErrorLogService {
  constructor(@Inject(EntityManager) private readonly em: EntityManager) {}

  public async logNotFound(input: {
    readonly requestPath: string;
    readonly httpMethod?: string;
    readonly userAgent?: string | null;
  }): Promise<void> {
    const requestPath = normalizeRequestPath(input.requestPath);
    await this.em.transactional(async (tx) => {
      tx.persist(
        tx.create(CrawlErrorLog, {
          id: randomUUID(),
          requestPath,
          httpMethod: input.httpMethod ?? 'GET',
          userAgent: input.userAgent ?? null,
          occurredAt: new Date(),
        }),
      );
    });
  }

  public async countRecent(hours = 24): Promise<number> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.em.count(CrawlErrorLog, { occurredAt: { $gte: since } });
  }

  public async listRecent(limit = 50): Promise<
    readonly {
      readonly id: string;
      readonly requestPath: string;
      readonly httpMethod: string;
      readonly occurredAt: Date;
    }[]
  > {
    const rows = await this.em.find(
      CrawlErrorLog,
      {},
      { orderBy: { occurredAt: 'desc' }, limit: Math.min(200, limit) },
    );
    return rows.map((row) => ({
      id: row.id,
      requestPath: row.requestPath,
      httpMethod: row.httpMethod,
      occurredAt: row.occurredAt,
    }));
  }
}
