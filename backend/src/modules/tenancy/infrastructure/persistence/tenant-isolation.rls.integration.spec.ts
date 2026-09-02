import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MikroORM } from '@mikro-orm/core';
import {
  createRequestContext,
  runWithTenantContext,
  setAuthenticatedPrincipal,
  setPlatformScope,
  setStoreScope,
  setVendorScope,
} from '../../../../shared-kernel/infrastructure/context/tenant-context.storage';
import { applyRlsSessionVariables } from '../../../../shared-kernel/infrastructure/persistence/rls-session';

const databaseUrl = process.env.DATABASE_URL;

async function withRequestScope<T>(work: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    runWithTenantContext(createRequestContext('rls-test'), () => {
      work().then(resolve).catch(reject);
    });
  });
}

describe.runIf(Boolean(databaseUrl))('tenant isolation RLS integration', () => {
  it('blocks cross-vendor reads and allows platform scope bypass', async () => {
    const orm = await MikroORM.init({
      clientUrl: databaseUrl as string,
      driver: PostgreSqlDriver,
      entities: [],
      discovery: { disableDynamicFileAccess: true, warnWhenNoEntities: false },
    });

    const vendorA = randomUUID();
    const vendorB = randomUUID();
    const storeA = randomUUID();
    const sampleA = randomUUID();
    const sampleB = randomUUID();

    try {
      const roleRows = (await orm.em.execute(
        `select rolsuper from pg_roles where rolname = current_user`,
      )) as Array<{ rolsuper: boolean }>;
      if (roleRows[0]?.rolsuper === true) {
        // ponytail: local DATABASE_URL often uses a superuser that bypasses RLS.
        return;
      }

      await orm.em.transactional(async (em) => {
        await em.execute(
          `insert into tenant_isolation_samples (id, vendor_id, store_id, label, created_at)
           values (?, ?, ?, ?, now()), (?, ?, null, ?, now())`,
          [sampleA, vendorA, storeA, 'A-store', sampleB, vendorB, 'B-vendor'],
        );
      });

      const vendorScopedCount = await withRequestScope(async () => {
        setAuthenticatedPrincipal({
          userId: randomUUID(),
          email: 'a@b.co',
          roles: ['VENDOR_OWNER'],
        });
        setVendorScope(vendorA, vendorA);
        setStoreScope(storeA);

        return orm.em.transactional(async (em) => {
          await applyRlsSessionVariables(em);
          const rows = (await em.execute(
            `select id::text from tenant_isolation_samples order by label`,
          )) as unknown[];
          return rows.length;
        });
      });

      expect(vendorScopedCount).toBe(1);

      const platformScopedCount = await withRequestScope(async () => {
        setAuthenticatedPrincipal({
          userId: randomUUID(),
          email: 'admin@b.co',
          roles: ['PLATFORM_ADMIN'],
        });
        setPlatformScope(true);

        return orm.em.transactional(async (em) => {
          await applyRlsSessionVariables(em);
          const rows = (await em.execute(
            `select id::text from tenant_isolation_samples`,
          )) as unknown[];
          return rows.length;
        });
      });

      expect(platformScopedCount).toBeGreaterThanOrEqual(2);
    } finally {
      await orm.em.transactional(async (em) => {
        await em.execute(`delete from tenant_isolation_samples where id in (?, ?)`, [
          sampleA,
          sampleB,
        ]);
      });
      await orm.close(true);
    }
  });
});
