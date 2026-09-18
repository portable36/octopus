import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import type {
  InventoryReportPort,
  InventoryReportSummary,
  InventoryStockAlertRow,
} from '../../../../shared-kernel/application/ports/inventory-report.port';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import { stockStatus } from '../../domain/inventory.types';
import { InventoryItemOrmEntity } from '../persistence/inventory-item.orm-entity';

@Injectable()
export class InventoryReportAdapter implements InventoryReportPort {
  constructor(private readonly em: EntityManager) {}

  public async summarize(alertLimit = 20): Promise<InventoryReportSummary> {
    const cappedAlerts = Math.max(1, Math.min(100, alertLimit));
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(
        InventoryItemOrmEntity,
        { status: 'ACTIVE' },
        {
          fields: ['storeId', 'variantId', 'onHand', 'reserved', 'lowStockThreshold'],
        },
      );

      const stores = new Set<string>();
      let inStockCount = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;
      const alerts: InventoryStockAlertRow[] = [];

      for (const row of rows) {
        stores.add(row.storeId);
        const available = row.onHand - row.reserved;
        const status = stockStatus(available, row.lowStockThreshold);
        if (status === 'OUT_OF_STOCK') {
          outOfStockCount += 1;
        } else if (status === 'LOW_STOCK') {
          lowStockCount += 1;
        } else {
          inStockCount += 1;
        }
        if (status === 'OUT_OF_STOCK' || status === 'LOW_STOCK') {
          alerts.push({
            storeId: row.storeId,
            variantId: row.variantId,
            available,
            lowStockThreshold: row.lowStockThreshold,
            stockStatus: status,
          });
        }
      }

      alerts.sort((a, b) => {
        if (a.stockStatus !== b.stockStatus) {
          return a.stockStatus === 'OUT_OF_STOCK' ? -1 : 1;
        }
        return a.available - b.available;
      });

      return {
        itemCount: rows.length,
        storeCount: stores.size,
        inStockCount,
        lowStockCount,
        outOfStockCount,
        alerts: alerts.slice(0, cappedAlerts),
      };
    });
  }
}
