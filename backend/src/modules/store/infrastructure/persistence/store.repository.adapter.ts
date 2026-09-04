import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { StoreRepository } from '../../application/ports/store-repository.interface';
import type {
  AdminStoreListQuery,
  AdminStoreListResult,
  AdminStoreListRow,
  AdminStoreStats,
} from '../../application/queries/admin-store-list.types';
import type { Store } from '../../domain/aggregates/store.aggregate';
import type { StoreStatus, StoreType } from '../../domain/store.types';
import { appendStoreOutbox } from './append-store-outbox';
import { applyToOrm, toDomain } from './store.mapper';
import { StoreOrmEntity } from './store.orm-entity';

type AdminListSqlRow = {
  readonly id: string;
  readonly vendor_id: string;
  readonly vendor_display_name: string | null;
  readonly store_code: string;
  readonly store_type: StoreType;
  readonly status: StoreStatus;
  readonly display_name: string;
  readonly slug: string;
  readonly city: string | null;
  readonly region: string | null;
  readonly country_code: string;
  readonly created_at: Date | string;
};

@Injectable()
export class StoreRepositoryAdapter implements StoreRepository {
  constructor(private readonly em: EntityManager) {}

  public async save(store: Store): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(
        StoreOrmEntity,
        { id: store.id.value },
        { populate: ['staff'] },
      );
      const entity = existing ?? new StoreOrmEntity();
      applyToOrm(store, entity);
      await tx.persist(entity).flush();
      await appendStoreOutbox(tx, store.id.value, store.getUncommittedEvents());
      store.clearEvents();
    });
  }

  public async findById(id: string): Promise<Store | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(StoreOrmEntity, { id }, { populate: ['staff'] });
      return entity ? toDomain(entity) : null;
    });
  }

  public async findByVendorId(vendorId: string): Promise<Store[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(StoreOrmEntity, { vendorId }, { populate: ['staff'] });
      return entities.map(toDomain);
    });
  }

  public async findByStaffUserId(userId: string): Promise<Store[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(
        StoreOrmEntity,
        { staff: { userId } },
        { populate: ['staff'] },
      );
      return entities.map(toDomain);
    });
  }

  public async listAll(): Promise<Store[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(StoreOrmEntity, {}, { populate: ['staff'] });
      return entities.map(toDomain);
    });
  }

  public async listAdmin(query: AdminStoreListQuery): Promise<AdminStoreListResult> {
    return withRlsContext(this.em, async (tx) => {
      const conn = tx.getConnection();
      const where: string[] = ['1=1'];
      const params: unknown[] = [];

      if (query.q && query.q.trim() !== '') {
        const like = `%${query.q.trim()}%`;
        where.push(
          `(s.display_name ilike ? or s.store_code ilike ? or s.slug ilike ? or coalesce(v.display_name, '') ilike ? or coalesce(s.email, '') ilike ? or coalesce(s.phone, '') ilike ?)`,
        );
        params.push(like, like, like, like, like, like);
      }
      if (query.statuses && query.statuses.length > 0) {
        where.push(`s.status in (${query.statuses.map(() => '?').join(', ')})`);
        params.push(...query.statuses);
      }
      if (query.vendorId) {
        where.push('s.vendor_id = ?');
        params.push(query.vendorId);
      }
      if (query.storeType) {
        where.push('s.store_type = ?');
        params.push(query.storeType);
      }
      if (query.country) {
        where.push('s.country_code = ?');
        params.push(query.country.toUpperCase());
      }

      const whereSql = where.join(' and ');
      const orderBy =
        query.sort === 'createdAt_asc'
          ? 's.created_at asc'
          : query.sort === 'name_asc'
            ? 's.display_name asc'
            : query.sort === 'name_desc'
              ? 's.display_name desc'
              : 's.created_at desc';

      const countRows = (await conn.execute(
        `select count(*)::int as c
           from stores s
           left join vendors v on v.id = s.vendor_id
          where ${whereSql}`,
        params,
      )) as Array<{ c: number }>;
      const total = Number(countRows[0]?.c ?? 0);
      const offset = (query.page - 1) * query.limit;

      const rows = (await conn.execute(
        `select s.id,
                s.vendor_id,
                v.display_name as vendor_display_name,
                s.store_code,
                s.store_type,
                s.status,
                s.display_name,
                s.slug,
                s.city,
                s.region,
                s.country_code,
                s.created_at
           from stores s
           left join vendors v on v.id = s.vendor_id
          where ${whereSql}
          order by ${orderBy}
          limit ? offset ?`,
        [...params, query.limit, offset],
      )) as AdminListSqlRow[];

      const items: AdminStoreListRow[] = rows.map((row) => ({
        id: row.id,
        vendorId: row.vendor_id,
        vendorDisplayName: row.vendor_display_name,
        storeCode: row.store_code,
        storeType: row.store_type,
        status: row.status,
        displayName: row.display_name,
        slug: row.slug,
        city: row.city,
        region: row.region,
        countryCode: row.country_code,
        createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      }));

      return { items, total, page: query.page, limit: query.limit };
    });
  }

  public async statsByStatus(): Promise<AdminStoreStats> {
    return withRlsContext(this.em, async (tx) => {
      const rows = (await tx
        .getConnection()
        .execute(`select status, count(*)::int as count from stores group by status`)) as Array<{
        status: string;
        count: number;
      }>;
      const byStatus: Record<string, number> = {};
      let total = 0;
      for (const row of rows) {
        const count = Number(row.count);
        byStatus[row.status] = count;
        total += count;
      }
      return { total, byStatus };
    });
  }

  public async existsByVendorAndSlug(vendorId: string, slug: string): Promise<boolean> {
    return withRlsContext(this.em, async (tx) => {
      const count = await tx.count(StoreOrmEntity, { vendorId, slug });
      return count > 0;
    });
  }

  public async existsByVendorAndStoreCode(vendorId: string, storeCode: string): Promise<boolean> {
    return withRlsContext(this.em, async (tx) => {
      const count = await tx.count(StoreOrmEntity, { vendorId, storeCode });
      return count > 0;
    });
  }

  public async findActiveBySlug(slug: string, vendorId?: string): Promise<Store | null> {
    return withRlsContext(this.em, async (tx) => {
      const where: Record<string, unknown> = { slug, status: 'active' };
      if (vendorId) {
        where.vendorId = vendorId;
      }
      const entity = await tx.findOne(StoreOrmEntity, where, { populate: ['staff'] });
      return entity ? toDomain(entity) : null;
    });
  }
}
