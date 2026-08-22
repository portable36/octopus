import type { EntityManager } from '@mikro-orm/core';
import { tryGetTenantContext } from '../context/tenant-context.storage';

/**
 * Applies PostgreSQL session variables for the current request scope.
 * Always uses SET LOCAL so values are transaction-scoped and safe with pooling.
 */
export async function applyRlsSessionVariables(em: EntityManager): Promise<void> {
  const connection = em.getConnection();
  const context = tryGetTenantContext();

  if (!context) {
    await connection.execute(`select set_config('app.platform_scope', 'false', true)`);
    await connection.execute(`select set_config('app.vendor_id', '', true)`);
    await connection.execute(`select set_config('app.store_id', '', true)`);
    await connection.execute(`select set_config('app.user_id', '', true)`);
    return;
  }

  const vendorId = context.vendorId ?? '';
  const storeId = context.storeId ?? '';
  const userId = context.userId ?? context.principal?.userId ?? '';
  const platformScope = context.platformScope === true ? 'true' : 'false';

  await connection.execute(`select set_config('app.platform_scope', ?, true)`, [platformScope]);
  await connection.execute(`select set_config('app.vendor_id', ?, true)`, [vendorId]);
  await connection.execute(`select set_config('app.store_id', ?, true)`, [storeId]);
  await connection.execute(`select set_config('app.user_id', ?, true)`, [userId]);
}

export async function withRlsContext<T>(
  em: EntityManager,
  work: (transactionalEm: EntityManager) => Promise<T>,
): Promise<T> {
  return em.transactional(async (transactionalEm) => {
    await applyRlsSessionVariables(transactionalEm);
    return work(transactionalEm);
  });
}
