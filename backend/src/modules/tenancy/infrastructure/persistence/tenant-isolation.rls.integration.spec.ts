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
  // Must pass an async callback so AsyncLocalStorage spans awaits inside work().
  return runWithTenantContext(createRequestContext('rls-test'), async () => work());
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
        `select current_user as role_name, rolsuper
         from pg_roles
         where rolname = current_user`,
      )) as Array<{ role_name: string; rolsuper: boolean }>;

      if (roleRows[0]?.rolsuper === true) {
        // Owner/superuser still bypasses RLS — prefer DATABASE_URL=octopus_app after Migration20260920120000.
        return;
      }

      expect(roleRows[0]?.rolsuper).toBe(false);

      await orm.em.transactional(async (em) => {
        await em.execute(`select set_config('app.platform_scope', 'true', true)`);
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
        await em.execute(`select set_config('app.platform_scope', 'true', true)`);
        await em.execute(`delete from tenant_isolation_samples where id in (?, ?)`, [
          sampleA,
          sampleB,
        ]);
      });
      await orm.close(true);
    }
  });
});
