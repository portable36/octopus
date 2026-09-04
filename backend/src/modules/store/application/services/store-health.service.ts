import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { StoreStatus } from '../../domain/store.types';

export type StoreHealthSeverity = 'OK' | 'WARNING' | 'CRITICAL';

export type StoreHealthCheck = {
  readonly key: string;
  readonly label: string;
  readonly ok: boolean;
  readonly severity: StoreHealthSeverity;
  readonly detail: string;
};

export type StoreHealthReport = {
  readonly storeId: string;
  readonly score: StoreHealthSeverity;
  readonly checks: readonly StoreHealthCheck[];
};

type CountRow = { readonly c: string | number };

@Injectable()
export class StoreHealthService {
  constructor(private readonly em: EntityManager) {}

  public async evaluate(storeId: string, status: StoreStatus): Promise<StoreHealthReport> {
    return withRlsContext(this.em, async (tx) => {
      const conn = tx.getConnection();

      const [domainRows, warehouseRows, templateRows, settingsRows] = await Promise.all([
        conn.execute(
          `select count(*)::int as c,
                  count(*) filter (where verification_status = 'verified')::int as verified
             from store_domains
            where store_id = ?`,
          [storeId],
        ) as Promise<Array<{ c: number; verified: number }>>,
        conn.execute(`select count(*)::int as c from inventory_warehouses where store_id = ?`, [
          storeId,
        ]) as Promise<CountRow[]>,
        conn.execute(`select count(*)::int as c from pos_receipt_templates where store_id = ?`, [
          storeId,
        ]) as Promise<CountRow[]>,
        conn.execute(
          `select count(*)::int as c
             from configuration_documents
            where store_id = ?
              and scope_kind = 'store'`,
          [storeId],
        ) as Promise<CountRow[]>,
      ]);

      const domainCount = Number(domainRows[0]?.c ?? 0);
      const verifiedCount = Number(domainRows[0]?.verified ?? 0);
      const warehouseCount = Number(warehouseRows[0]?.c ?? 0);
      const templateCount = Number(templateRows[0]?.c ?? 0);
      const settingsCount = Number(settingsRows[0]?.c ?? 0);

      const checks: StoreHealthCheck[] = [
        {
          key: 'lifecycle_status',
          label: 'Lifecycle status',
          ok: status !== 'failed',
          severity: status === 'failed' ? 'CRITICAL' : status === 'suspended' ? 'WARNING' : 'OK',
          detail:
            status === 'failed'
              ? 'Provisioning failed; retry required.'
              : status === 'suspended'
                ? 'Store is suspended.'
                : status === 'maintenance'
                  ? 'Store is in maintenance.'
                  : `Status is ${status}.`,
        },
        {
          key: 'domain_present',
          label: 'Store domain',
          ok: domainCount > 0,
          severity: domainCount > 0 ? 'OK' : 'WARNING',
          detail:
            domainCount > 0
              ? `${domainCount} domain row(s) present.`
              : 'No store_domains row found.',
        },
        {
          key: 'domain_verified',
          label: 'Domain verification',
          ok: verifiedCount > 0,
          severity: verifiedCount > 0 ? 'OK' : domainCount > 0 ? 'WARNING' : 'WARNING',
          detail:
            verifiedCount > 0 ? `${verifiedCount} verified domain(s).` : 'No verified domain yet.',
        },
        {
          key: 'warehouse_exists',
          label: 'Default warehouse',
          ok: warehouseCount > 0,
          severity: warehouseCount > 0 ? 'OK' : status === 'active' ? 'CRITICAL' : 'WARNING',
          detail:
            warehouseCount > 0
              ? `${warehouseCount} warehouse(s) present.`
              : 'No inventory warehouse for this store.',
        },
        {
          key: 'pos_receipt_template',
          label: 'POS receipt template',
          ok: templateCount > 0,
          severity: templateCount > 0 ? 'OK' : 'WARNING',
          detail:
            templateCount > 0 ? 'Receipt template provisioned.' : 'No POS receipt template found.',
        },
        {
          key: 'settings_document',
          label: 'Store settings document',
          ok: settingsCount > 0,
          severity: settingsCount > 0 ? 'OK' : 'WARNING',
          detail:
            settingsCount > 0
              ? 'Configuration document present.'
              : 'No store-scoped configuration document.',
        },
      ];

      const score: StoreHealthSeverity = checks.some((c) => !c.ok && c.severity === 'CRITICAL')
        ? 'CRITICAL'
        : checks.some((c) => !c.ok && c.severity === 'WARNING')
          ? 'WARNING'
          : 'OK';

      return { storeId, score, checks };
    });
  }
}
