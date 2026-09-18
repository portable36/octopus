import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import type {
  PayoutReportCurrencyBucket,
  PayoutReportPort,
  PayoutReportStatusBucket,
  PayoutReportSummary,
} from '../../../../shared-kernel/application/ports/payout-report.port';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import { PAYOUT_RESERVING_STATUSES } from '../../domain/payout.types';
import { VendorPayoutOrmEntity } from '../persistence/payout.orm-entity';

@Injectable()
export class PayoutReportAdapter implements PayoutReportPort {
  constructor(private readonly em: EntityManager) {}

  public async summarize(days = 30): Promise<PayoutReportSummary> {
    const windowDays = Math.max(1, Math.min(365, days));
    const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(
        VendorPayoutOrmEntity,
        { requestedAt: { $gte: cutoff } },
        { fields: ['status', 'amountMinor', 'currencyCode'] },
      );

      const byStatus = new Map<string, { count: number; amountMinor: number }>();
      const byCurrency = new Map<
        string,
        { count: number; amountMinor: number; completedMinor: number; reservedMinor: number }
      >();

      for (const row of rows) {
        const statusAcc = byStatus.get(row.status) ?? { count: 0, amountMinor: 0 };
        statusAcc.count += 1;
        statusAcc.amountMinor += row.amountMinor;
        byStatus.set(row.status, statusAcc);

        const currencyAcc = byCurrency.get(row.currencyCode) ?? {
          count: 0,
          amountMinor: 0,
          completedMinor: 0,
          reservedMinor: 0,
        };
        currencyAcc.count += 1;
        currencyAcc.amountMinor += row.amountMinor;
        if (row.status === 'COMPLETED') {
          currencyAcc.completedMinor += row.amountMinor;
        }
        if ((PAYOUT_RESERVING_STATUSES as readonly string[]).includes(row.status)) {
          currencyAcc.reservedMinor += row.amountMinor;
        }
        byCurrency.set(row.currencyCode, currencyAcc);
      }

      const statusBuckets: PayoutReportStatusBucket[] = [...byStatus.entries()]
        .map(([status, acc]) => ({ status, count: acc.count, amountMinor: acc.amountMinor }))
        .sort((a, b) => b.count - a.count);

      const currencyBuckets: PayoutReportCurrencyBucket[] = [...byCurrency.entries()]
        .map(([currencyCode, acc]) => ({
          currencyCode,
          count: acc.count,
          amountMinor: acc.amountMinor,
          completedMinor: acc.completedMinor,
          reservedMinor: acc.reservedMinor,
        }))
        .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));

      return {
        days: windowDays,
        payoutCount: rows.length,
        byStatus: statusBuckets,
        byCurrency: currencyBuckets,
      };
    });
  }
}
