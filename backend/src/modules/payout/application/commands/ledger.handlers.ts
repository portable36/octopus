import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import { ORDER_PORT, type OrderPort } from '../../../../shared-kernel/application/ports/order.port';
import type {
  LedgerRefundAllocation,
  LedgerSaleRecognitionInput,
  VendorLedgerBalanceDto,
  VendorLedgerEntryDto,
} from '../../../../shared-kernel/application/ports/ledger.port';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import type { LedgerEntryRecord } from '../../domain/ledger.types';
import { InvalidLedgerAdjustmentError } from '../../domain/errors/ledger.errors';
import {
  buildReconciliationReport,
  type LedgerReconciliationReport,
} from '../../domain/services/build-reconciliation-report';
import {
  computeVendorBalance,
  saleAmountFromOrder,
} from '../../domain/services/compute-vendor-balance';
import { LEDGER_REPOSITORY, type LedgerRepository } from '../ports/ledger-repository.interface';
import { PAYOUT_REPOSITORY, type PayoutRepository } from '../ports/payout-repository.interface';

@Injectable()
export class LedgerCommandHandler {
  constructor(
    @Inject(LEDGER_REPOSITORY) private readonly ledger: LedgerRepository,
    @Inject(PAYOUT_REPOSITORY) private readonly payouts: PayoutRepository,
    @Inject(ORDER_PORT) private readonly orders: OrderPort,
    private readonly config: AppConfigService,
  ) {}

  public async recordSaleRecognition(input: LedgerSaleRecognitionInput): Promise<void> {
    const order = await this.orders.getFinanceSnapshot(input.orderId);
    if (!order) {
      return;
    }
    if (order.paymentStatus !== 'PAID') {
      return;
    }

    const saleMinor = saleAmountFromOrder({
      subtotalMinor: order.subtotalMinor,
      discountMinor: order.discountMinor,
    });
    if (saleMinor < 1 && order.commissionMinor < 1) {
      return;
    }

    const now = new Date();
    const availableAt = new Date(
      now.getTime() + this.config.ledgerSettlementDays * 24 * 60 * 60 * 1000,
    );

    await this.ledger.withTransaction(async (repo) => {
      if (saleMinor >= 1) {
        const saleKey = `ledger:sale:${order.orderId}`;
        const existingSale = await repo.findEntryByIdempotencyKey(saleKey);
        if (!existingSale) {
          const sale = buildEntry({
            vendorId: order.vendorId,
            storeId: order.storeId,
            entryType: 'SALE',
            direction: 'CREDIT',
            amountMinor: saleMinor,
            currencyCode: order.currencyCode,
            orderId: order.orderId,
            referenceType: 'ORDER',
            referenceId: order.orderId,
            idempotencyKey: saleKey,
            availableAt,
            occurredAt: now,
            metadata: {
              paymentIntentId: input.paymentIntentId ?? null,
              commissionRateBps: order.commissionRateBps,
            },
          });
          await repo.appendEntry(sale);
          await repo.appendOutbox({
            aggregateId: sale.id,
            eventType: 'VendorSaleRecorded',
            payload: {
              entryId: sale.id,
              vendorId: sale.vendorId,
              storeId: sale.storeId,
              orderId: order.orderId,
              amountMinor: sale.amountMinor,
              currencyCode: sale.currencyCode,
            },
          });
        }
      }

      if (order.commissionMinor >= 1) {
        const commissionKey = `ledger:commission:${order.orderId}`;
        const existingCommission = await repo.findEntryByIdempotencyKey(commissionKey);
        if (!existingCommission) {
          const commission = buildEntry({
            vendorId: order.vendorId,
            storeId: order.storeId,
            entryType: 'COMMISSION',
            direction: 'DEBIT',
            amountMinor: order.commissionMinor,
            currencyCode: order.currencyCode,
            orderId: order.orderId,
            referenceType: 'ORDER',
            referenceId: `${order.orderId}:commission`,
            idempotencyKey: commissionKey,
            availableAt,
            occurredAt: now,
            metadata: { commissionRateBps: order.commissionRateBps },
          });
          await repo.appendEntry(commission);
          await repo.appendOutbox({
            aggregateId: commission.id,
            eventType: 'CommissionRecorded',
            payload: {
              entryId: commission.id,
              vendorId: commission.vendorId,
              storeId: commission.storeId,
              orderId: order.orderId,
              amountMinor: commission.amountMinor,
              currencyCode: commission.currencyCode,
            },
          });
        }
      }
    });

    await this.rebuildVendorBalance(order.vendorId);
  }

  public async recordRefundAllocation(input: LedgerRefundAllocation): Promise<void> {
    if (input.entryType !== 'REFUND' || input.amountMinor < 1) {
      return;
    }
    const existing = await this.ledger.findEntryByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return;
    }

    const now = new Date();
    // Refunds reduce available immediately (no settlement delay).
    const refund = buildEntry({
      vendorId: input.vendorId,
      storeId: input.storeId,
      entryType: 'REFUND',
      direction: 'DEBIT',
      amountMinor: input.amountMinor,
      currencyCode: input.currencyCode,
      orderId: input.orderId,
      referenceType: 'REFUND',
      referenceId: input.referenceId,
      idempotencyKey: input.idempotencyKey,
      availableAt: now,
      occurredAt: now,
      metadata: {
        paymentIntentId: input.paymentIntentId,
        returnId: input.returnId,
        method: input.method,
      },
    });

    await this.ledger.withTransaction(async (repo) => {
      await repo.appendEntry(refund);
      if (
        input.commissionReversalMinor != null &&
        Number.isInteger(input.commissionReversalMinor) &&
        input.commissionReversalMinor > 0
      ) {
        const clawbackKey = `ledger:commission-reversal:${input.refundId}`;
        const prior = await repo.findEntryByIdempotencyKey(clawbackKey);
        if (!prior) {
          await repo.appendEntry(
            buildEntry({
              vendorId: input.vendorId,
              storeId: input.storeId,
              entryType: 'ADJUSTMENT',
              direction: 'CREDIT',
              amountMinor: input.commissionReversalMinor,
              currencyCode: input.currencyCode,
              orderId: input.orderId,
              referenceType: 'REFUND',
              referenceId: `${input.refundId}:commission-reversal`,
              idempotencyKey: clawbackKey,
              availableAt: now,
              occurredAt: now,
              metadata: { reason: 'commission_reversal' },
            }),
          );
        }
      }
    });

    await this.rebuildVendorBalance(input.vendorId);
  }

  /** Idempotent DEBIT PAYOUT when a vendor payout completes. */
  public async recordPayoutDebit(input: {
    readonly payoutId: string;
    readonly vendorId: string;
    readonly storeId: string;
    readonly amountMinor: number;
    readonly currencyCode: string;
    readonly providerRef: string | null;
  }): Promise<string> {
    const idempotencyKey = `ledger:payout:${input.payoutId}`;
    const existing = await this.ledger.findEntryByIdempotencyKey(idempotencyKey);
    if (existing) {
      return existing.id;
    }
    if (!Number.isInteger(input.amountMinor) || input.amountMinor < 1) {
      throw new Error('Invalid payout debit amount.');
    }

    const now = new Date();
    const entry = buildEntry({
      vendorId: input.vendorId,
      storeId: input.storeId,
      entryType: 'PAYOUT',
      direction: 'DEBIT',
      amountMinor: input.amountMinor,
      currencyCode: input.currencyCode,
      orderId: null,
      referenceType: 'PAYOUT',
      referenceId: input.payoutId,
      idempotencyKey,
      availableAt: now,
      occurredAt: now,
      metadata: { providerRef: input.providerRef },
    });

    await this.ledger.withTransaction(async (repo) => {
      const prior = await repo.findEntryByIdempotencyKey(idempotencyKey);
      if (prior) {
        return;
      }
      await repo.appendEntry(entry);
      await repo.appendOutbox({
        aggregateId: entry.id,
        eventType: 'PayoutCompleted',
        payload: {
          entryId: entry.id,
          payoutId: input.payoutId,
          vendorId: input.vendorId,
          storeId: input.storeId,
          amountMinor: input.amountMinor,
          currencyCode: input.currencyCode,
          providerRef: input.providerRef,
        },
      });
    });

    await this.rebuildVendorBalance(input.vendorId);
    const saved = await this.ledger.findEntryByIdempotencyKey(idempotencyKey);
    return saved?.id ?? entry.id;
  }

  public async rebuildVendorBalance(vendorId: string): Promise<VendorLedgerBalanceDto> {
    const entries = await this.ledger.listEntriesByVendorId(vendorId);
    const computed = computeVendorBalance(entries, new Date());
    const snapshot = {
      vendorId,
      currencyCode: computed.currencyCode,
      pendingMinor: computed.pendingMinor,
      availableMinor: computed.availableMinor,
      rebuiltAt: new Date(),
    };
    await this.ledger.saveBalance(snapshot);
    return toBalanceDto(snapshot);
  }

  public async getVendorBalance(vendorId: string): Promise<VendorLedgerBalanceDto | null> {
    const existing = await this.ledger.findBalance(vendorId);
    if (existing) {
      return toBalanceDto(existing);
    }
    const entries = await this.ledger.listEntriesByVendorId(vendorId);
    if (entries.length === 0) {
      return null;
    }
    return this.rebuildVendorBalance(vendorId);
  }

  public async listVendorEntries(
    vendorId: string,
    limit: number,
    offset: number,
  ): Promise<readonly VendorLedgerEntryDto[]> {
    const rows = await this.ledger.listEntriesByVendorIdPaged(vendorId, limit, offset);
    return rows.map(toEntryDto);
  }

  /** Platform-only ADJUSTMENT with reason + actor audit metadata. */
  public async recordAdjustment(input: {
    readonly vendorId: string;
    readonly storeId: string;
    readonly direction: 'CREDIT' | 'DEBIT';
    readonly amountMinor: number;
    readonly currencyCode: string;
    readonly reason: string;
    readonly actorUserId: string;
    readonly idempotencyKey: string;
    readonly availableImmediately?: boolean;
  }): Promise<VendorLedgerEntryDto> {
    const reason = input.reason.trim();
    if (!reason || reason.length < 3) {
      throw new InvalidLedgerAdjustmentError('Adjustment reason is required (min 3 characters).');
    }
    if (!Number.isInteger(input.amountMinor) || input.amountMinor < 1) {
      throw new InvalidLedgerAdjustmentError('Adjustment amount must be a positive integer.');
    }
    const currencyCode = input.currencyCode.trim().toUpperCase();
    if (currencyCode.length !== 3) {
      throw new InvalidLedgerAdjustmentError('currencyCode must be a 3-letter ISO code.');
    }

    const existing = await this.ledger.findEntryByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      if (
        existing.vendorId !== input.vendorId ||
        existing.amountMinor !== input.amountMinor ||
        existing.direction !== input.direction ||
        existing.entryType !== 'ADJUSTMENT'
      ) {
        throw new InvalidLedgerAdjustmentError(
          'Idempotency key already used for a different adjustment.',
        );
      }
      return toEntryDto(existing);
    }

    const now = new Date();
    const referenceId = UniqueID.create().value;
    const entry = buildEntry({
      vendorId: input.vendorId,
      storeId: input.storeId,
      entryType: 'ADJUSTMENT',
      direction: input.direction,
      amountMinor: input.amountMinor,
      currencyCode,
      orderId: null,
      referenceType: 'ADJUSTMENT',
      referenceId,
      idempotencyKey: input.idempotencyKey,
      availableAt:
        input.availableImmediately === false
          ? new Date(now.getTime() + this.config.ledgerSettlementDays * 24 * 60 * 60 * 1000)
          : now,
      occurredAt: now,
      metadata: {
        reason,
        actorUserId: input.actorUserId,
        audited: true,
      },
    });

    await this.ledger.withTransaction(async (repo) => {
      const prior = await repo.findEntryByIdempotencyKey(input.idempotencyKey);
      if (prior) {
        return;
      }
      await repo.appendEntry(entry);
      await repo.appendOutbox({
        aggregateId: entry.id,
        eventType: 'LedgerAdjustmentRecorded',
        payload: {
          entryId: entry.id,
          vendorId: entry.vendorId,
          storeId: entry.storeId,
          direction: entry.direction,
          amountMinor: entry.amountMinor,
          currencyCode: entry.currencyCode,
          reason,
          actorUserId: input.actorUserId,
        },
      });
    });

    await this.rebuildVendorBalance(input.vendorId);
    const saved = await this.ledger.findEntryByIdempotencyKey(input.idempotencyKey);
    return toEntryDto(saved ?? entry);
  }

  public async getVendorStatement(input: {
    readonly vendorId: string;
    readonly limit: number;
    readonly offset: number;
    readonly from?: Date;
    readonly to?: Date;
  }): Promise<{
    readonly vendorId: string;
    readonly total: number;
    readonly limit: number;
    readonly offset: number;
    readonly from: string | null;
    readonly to: string | null;
    readonly items: readonly VendorLedgerEntryDto[];
  }> {
    const filter =
      input.from || input.to
        ? {
            ...(input.from ? { from: input.from } : {}),
            ...(input.to ? { to: input.to } : {}),
          }
        : undefined;
    const [rows, total] = await Promise.all([
      this.ledger.listEntriesByVendorIdPaged(input.vendorId, input.limit, input.offset, filter),
      this.ledger.countEntriesByVendorId(input.vendorId, filter),
    ]);
    return {
      vendorId: input.vendorId,
      total,
      limit: input.limit,
      offset: input.offset,
      from: input.from?.toISOString() ?? null,
      to: input.to?.toISOString() ?? null,
      items: rows.map(toEntryDto),
    };
  }

  /** Report-only reconciliation (no auto-fix). */
  public async reconcileVendor(vendorId: string): Promise<LedgerReconciliationReport> {
    const [entries, snapshot, completed] = await Promise.all([
      this.ledger.listEntriesByVendorId(vendorId),
      this.ledger.findBalance(vendorId),
      this.payouts.listCompletedForVendor(vendorId),
    ]);
    const completedPayoutIds = new Set(completed.map((p) => p.id));
    const entryIds = new Set(entries.map((e) => e.id));
    const completedPayoutsMissingLedger = completed
      .filter((p) => !p.ledgerEntryId || !entryIds.has(p.ledgerEntryId))
      .map((p) => p.id);

    return buildReconciliationReport({
      vendorId,
      entries,
      snapshot,
      completedPayoutIds,
      completedPayoutsMissingLedger,
    });
  }

  /** Dashboard numbers: balance + reserved payouts + entry type totals. */
  public async getVendorFinanceSummary(vendorId: string): Promise<{
    readonly vendorId: string;
    readonly currencyCode: string;
    readonly pendingMinor: number;
    readonly availableMinor: number;
    readonly reservedPayoutMinor: number;
    readonly spendableMinor: number;
    readonly rebuiltAt: string | null;
    readonly totalsByType: Readonly<Record<string, number>>;
  }> {
    const [balance, reservedPayoutMinor, entries] = await Promise.all([
      this.getVendorBalance(vendorId),
      this.payouts.sumReservedMinor(vendorId),
      this.ledger.listEntriesByVendorId(vendorId),
    ]);
    const currencyCode = balance?.currencyCode ?? entries[0]?.currencyCode ?? 'BDT';
    const pendingMinor = balance?.pendingMinor ?? 0;
    const availableMinor = balance?.availableMinor ?? 0;
    const totalsByType: Record<string, number> = {};
    for (const entry of entries) {
      const signed = entry.direction === 'CREDIT' ? entry.amountMinor : -entry.amountMinor;
      totalsByType[entry.entryType] = (totalsByType[entry.entryType] ?? 0) + signed;
    }
    return {
      vendorId,
      currencyCode,
      pendingMinor,
      availableMinor,
      reservedPayoutMinor,
      spendableMinor: Math.max(0, availableMinor - reservedPayoutMinor),
      rebuiltAt: balance?.rebuiltAt ?? null,
      totalsByType,
    };
  }
}

function buildEntry(input: {
  readonly vendorId: string;
  readonly storeId: string;
  readonly entryType: LedgerEntryRecord['entryType'];
  readonly direction: LedgerEntryRecord['direction'];
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly orderId: string | null;
  readonly referenceType: LedgerEntryRecord['referenceType'];
  readonly referenceId: string;
  readonly idempotencyKey: string;
  readonly availableAt: Date;
  readonly occurredAt: Date;
  readonly metadata: Record<string, unknown> | null;
}): LedgerEntryRecord {
  return {
    id: UniqueID.create().value,
    vendorId: input.vendorId,
    storeId: input.storeId,
    entryType: input.entryType,
    direction: input.direction,
    amountMinor: input.amountMinor,
    currencyCode: input.currencyCode,
    orderId: input.orderId,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    idempotencyKey: input.idempotencyKey,
    availableAt: input.availableAt,
    occurredAt: input.occurredAt,
    createdAt: input.occurredAt,
    metadata: input.metadata,
  };
}

function toEntryDto(row: LedgerEntryRecord): VendorLedgerEntryDto {
  return {
    id: row.id,
    entryType: row.entryType,
    direction: row.direction,
    amountMinor: row.amountMinor,
    currencyCode: row.currencyCode,
    orderId: row.orderId,
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    availableAt: row.availableAt.toISOString(),
    occurredAt: row.occurredAt.toISOString(),
  };
}

function toBalanceDto(snapshot: {
  readonly vendorId: string;
  readonly currencyCode: string;
  readonly pendingMinor: number;
  readonly availableMinor: number;
  readonly rebuiltAt: Date;
}): VendorLedgerBalanceDto {
  return {
    vendorId: snapshot.vendorId,
    currencyCode: snapshot.currencyCode,
    pendingMinor: snapshot.pendingMinor,
    availableMinor: snapshot.availableMinor,
    rebuiltAt: snapshot.rebuiltAt.toISOString(),
  };
}
