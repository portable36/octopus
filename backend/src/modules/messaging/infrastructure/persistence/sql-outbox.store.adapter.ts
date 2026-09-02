import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import {
  createRequestContext,
  runWithTenantContext,
  setPlatformScope,
} from '../../../../shared-kernel/infrastructure/context/tenant-context.storage';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { OutboxStore } from '../../application/ports/outbox-store.interface';
import type { OutboxRow, OutboxSource } from '../../domain/outbox.types';

type SqlOutboxRow = {
  id: string;
  aggregate_id: string;
  event_type: string;
  payload_json: Record<string, unknown> | string;
  event_version: number | string;
  created_at: Date | string;
  retry_count: number | string;
};

function parsePayload(raw: Record<string, unknown> | string): Record<string, unknown> {
  if (typeof raw === 'string') {
    return JSON.parse(raw) as Record<string, unknown>;
  }
  return raw;
}

function toRow(source: OutboxSource, row: SqlOutboxRow): OutboxRow {
  return {
    id: row.id,
    source,
    aggregateId: row.aggregate_id,
    eventType: row.event_type,
    payload: parsePayload(row.payload_json),
    eventVersion: Number(row.event_version),
    createdAt: new Date(row.created_at),
    retryCount: Number(row.retry_count),
  };
}

function outboxTable(source: OutboxSource): string {
  if (source === 'payment') return 'payment_outbox';
  if (source === 'fulfillment') return 'fulfillment_outbox';
  if (source === 'payout') return 'payout_outbox';
  if (source === 'catalog') return 'catalog_outbox';
  if (source === 'inventory') return 'inventory_outbox';
  if (source === 'order') return 'order_outbox';
  if (source === 'store') return 'store_outbox';
  if (source === 'notification') {
    throw new Error('notification delivery jobs are not claimed from SQL outbox');
  }
  return 'returns_outbox';
}

/**
 * Claims unpublished outbox rows with SKIP LOCKED (no cross-module entity imports).
 */
@Injectable()
export class SqlOutboxStoreAdapter implements OutboxStore {
  constructor(private readonly em: EntityManager) {}

  public async claimUnpublished(batchSize: number, maxRetries: number): Promise<OutboxRow[]> {
    return this.withPlatformScope(async () =>
      withRlsContext(this.em, async (tx) => {
        const conn = tx.getConnection();
        // SKIP LOCKED reduces overlap while the TX is open; durable dedupe is BullMQ jobId.
        const payment = await this.selectBatch(conn, 'payment_outbox', maxRetries, batchSize);
        const fulfillment = await this.selectBatch(
          conn,
          'fulfillment_outbox',
          maxRetries,
          batchSize,
        );
        const returns = await this.selectBatch(conn, 'returns_outbox', maxRetries, batchSize);
        const payout = await this.selectBatch(conn, 'payout_outbox', maxRetries, batchSize);
        const catalog = await this.selectBatch(conn, 'catalog_outbox', maxRetries, batchSize);
        const inventory = await this.selectBatch(conn, 'inventory_outbox', maxRetries, batchSize);
        const order = await this.selectBatch(conn, 'order_outbox', maxRetries, batchSize);
        const store = await this.selectBatch(conn, 'store_outbox', maxRetries, batchSize);

        return [
          ...payment.map((row) => toRow('payment', row)),
          ...fulfillment.map((row) => toRow('fulfillment', row)),
          ...returns.map((row) => toRow('returns', row)),
          ...payout.map((row) => toRow('payout', row)),
          ...catalog.map((row) => toRow('catalog', row)),
          ...inventory.map((row) => toRow('inventory', row)),
          ...order.map((row) => toRow('order', row)),
          ...store.map((row) => toRow('store', row)),
        ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }),
    );
  }

  private async selectBatch(
    conn: { execute: (sql: string, params?: unknown[]) => Promise<unknown> },
    table:
      | 'payment_outbox'
      | 'fulfillment_outbox'
      | 'returns_outbox'
      | 'payout_outbox'
      | 'catalog_outbox'
      | 'inventory_outbox'
      | 'order_outbox'
      | 'store_outbox',
    maxRetries: number,
    batchSize: number,
  ): Promise<SqlOutboxRow[]> {
    const raw = await conn.execute(
      `
      select id, aggregate_id, event_type, payload_json, event_version, created_at, retry_count
      from ${table}
      where published_at is null
        and retry_count < ?
      order by created_at asc
      limit ?
      for update skip locked
      `,
      [maxRetries, batchSize],
    );
    return Array.isArray(raw) ? (raw as SqlOutboxRow[]) : [];
  }

  public async markPublished(source: OutboxSource, id: string): Promise<void> {
    const table = outboxTable(source);
    await this.withPlatformScope(async () =>
      withRlsContext(this.em, async (tx) => {
        await tx
          .getConnection()
          .execute(
            `update ${table} set published_at = now() where id = ? and published_at is null`,
            [id],
          );
      }),
    );
  }

  public async markDispatchFailure(source: OutboxSource, id: string): Promise<void> {
    const table = outboxTable(source);
    await this.withPlatformScope(async () =>
      withRlsContext(this.em, async (tx) => {
        await tx
          .getConnection()
          .execute(`update ${table} set retry_count = retry_count + 1 where id = ?`, [id]);
      }),
    );
  }

  private async withPlatformScope<T>(work: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      runWithTenantContext(createRequestContext(`outbox-${Date.now()}`), () => {
        setPlatformScope(true);
        work().then(resolve).catch(reject);
      });
    });
  }
}
