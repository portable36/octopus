import type { EntityManager } from '@mikro-orm/core';
import { tryGetTenantContext } from '../context/tenant-context.storage';

/**
 * Applies PostgreSQL session variables for the current request scope.
 * Always uses SET LOCAL so values are transaction-scoped and safe with pooling.
 *
 * Must use `em.execute` (transactional EM), not `em.getConnection().execute` —
 * the raw connection is outside the open transaction, so SET LOCAL would not apply.
 */
export async function applyRlsSessionVariables(em: EntityManager): Promise<void> {
  const context = tryGetTenantContext();

  if (!context) {
    await em.execute(`select set_config('app.platform_scope', 'false', true)`);
    await em.execute(`select set_config('app.vendor_id', '', true)`);
    await em.execute(`select set_config('app.store_id', '', true)`);
    await em.execute(`select set_config('app.user_id', '', true)`);
    await em.execute(`select set_config('app.guest_token', '', true)`);
    return;
  }

  const vendorId = context.vendorId ?? '';
  const storeId = context.storeId ?? '';
  const userId = context.userId ?? context.principal?.userId ?? '';
  const platformScope = context.platformScope === true ? 'true' : 'false';
  const guestToken = context.guestToken ?? '';

  await em.execute(`select set_config('app.platform_scope', ?, true)`, [platformScope]);
  await em.execute(`select set_config('app.vendor_id', ?, true)`, [vendorId]);
  await em.execute(`select set_config('app.store_id', ?, true)`, [storeId]);
  await em.execute(`select set_config('app.user_id', ?, true)`, [userId]);
  await em.execute(`select set_config('app.guest_token', ?, true)`, [guestToken]);
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
