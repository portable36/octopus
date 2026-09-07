import { Inject, Injectable } from '@nestjs/common';
import { Receipt } from '../../domain/aggregates/receipt.aggregate';
import type { ReceiptSaleLine, ReceiptPaymentLine } from '../../domain/receipt.types';
import { renderReceiptText } from '../../domain/services/receipt-renderer';
import {
  renderReceiptEscPos,
  renderReceiptEscPosBase64,
  renderReceiptEscPosHex,
} from '../../domain/services/escpos-renderer';
import { RECEIPT_REPOSITORY, type ReceiptRepository } from '../ports/receipt-repository.interface';
import {
  RECEIPT_TEMPLATE_REPOSITORY,
  type ReceiptTemplateRepository,
} from '../ports/receipt-template-repository.interface';
import {
  REGISTER_REPOSITORY,
  type RegisterRepository,
} from '../ports/register-repository.interface';
import { ReceiptAlreadyExistsError, ReceiptNotFoundError } from '../errors/pos.errors';
import { PosAuthorizationService } from '../services/pos-authorization.service';
import { ReceiptTemplateHandler } from './receipt-template.handler';

export type CreateReceiptFromSaleInput = {
  readonly storeId: string;
  readonly actorUserId: string;
  readonly actorRoles: readonly string[];
  readonly saleId: string;
  readonly soldAt: Date;
  readonly cashierName: string;
  readonly registerCode?: string | null;
  readonly lines: readonly ReceiptSaleLine[];
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly taxMinor: number;
  readonly totalMinor: number;
  readonly payments: readonly ReceiptPaymentLine[];
  readonly changeMinor: number;
  readonly currencyCode?: string;
};

export interface OfflineReceiptItemInput {
  readonly clientTransactionId: string;
  readonly soldAt: Date;
  readonly cashierName: string;
  readonly registerCode?: string | null;
  readonly lines: readonly ReceiptSaleLine[];
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly taxMinor: number;
  readonly totalMinor: number;
  readonly payments: readonly ReceiptPaymentLine[];
  readonly changeMinor: number;
  readonly currencyCode?: string;
}

export interface SyncOfflineReceiptsInput {
  readonly storeId: string;
  readonly actorUserId: string;
  readonly actorRoles: readonly string[];
  readonly items: readonly OfflineReceiptItemInput[];
}

export interface SyncReceiptResult {
  readonly clientTransactionId: string;
  readonly status: 'SYNCED' | 'ALREADY_SYNCED' | 'REJECTED';
  readonly receiptId?: string;
  readonly receiptNumber?: string;
  readonly error?: string;
}

export interface SyncOfflineReceiptsResult {
  readonly totalProcessed: number;
  readonly syncedCount: number;
  readonly alreadySyncedCount: number;
  readonly rejectedCount: number;
  readonly results: readonly SyncReceiptResult[];
}

@Injectable()
export class CreateReceiptHandler {
  constructor(
    @Inject(RECEIPT_REPOSITORY) private readonly receipts: ReceiptRepository,
    @Inject(RECEIPT_TEMPLATE_REPOSITORY)
    private readonly templates: ReceiptTemplateRepository,
    @Inject(REGISTER_REPOSITORY) private readonly registers: RegisterRepository,
    @Inject(PosAuthorizationService) private readonly auth: PosAuthorizationService,
    private readonly templateHandler: ReceiptTemplateHandler,
  ) {}

  public async fromSaleSnapshot(input: CreateReceiptFromSaleInput): Promise<Receipt> {
    const store = await this.auth.requireReceiptViewer(
      input.storeId,
      input.actorUserId,
      input.actorRoles,
    );

    const existing = await this.receipts.findByStoreAndSaleId(input.storeId, input.saleId);
    if (existing) {
      throw new ReceiptAlreadyExistsError();
    }

    const template =
      (await this.templates.findByStoreId(input.storeId)) ??
      (await this.templateHandler.getOrCreate(input.storeId, input.actorUserId, input.actorRoles));

    const receiptNumber = await this.receipts.allocateReceiptNumber(input.storeId, input.soldAt);
    const currencyCode = input.currencyCode ?? template.currencyCode;
    const snapshot = {
      saleId: input.saleId,
      receiptNumber,
      soldAt: input.soldAt,
      cashierName: input.cashierName,
      registerCode: input.registerCode ?? null,
      lines: input.lines,
      subtotalMinor: input.subtotalMinor,
      discountMinor: input.discountMinor,
      taxMinor: input.taxMinor,
      totalMinor: input.totalMinor,
      payments: input.payments,
      changeMinor: input.changeMinor,
      currencyCode,
    };

    const renderedText = renderReceiptText(template.toProps(), snapshot);
    const receipt = Receipt.create({
      storeId: store.storeId,
      vendorId: store.vendorId,
      saleId: input.saleId,
      receiptNumber,
      templateId: template.id.value,
      templateVersionUsed: template.version,
      snapshot,
      renderedText,
      createdBy: input.actorUserId,
    });
    await this.receipts.save(receipt);
    return receipt;
  }

  public async getById(
    receiptId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Receipt> {
    const receipt = await this.receipts.findById(receiptId);
    if (!receipt) {
      throw new ReceiptNotFoundError();
    }
    await this.auth.requireReceiptViewer(receipt.storeId, actorUserId, actorRoles);
    return receipt;
  }

  public async markPrinted(
    receiptId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<Receipt> {
    const receipt = await this.getById(receiptId, actorUserId, actorRoles);
    receipt.markPrinted();
    await this.receipts.save(receipt);
    return receipt;
  }

  public async getEscPos(
    receiptId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    options?: { kickCashDrawer?: boolean; cutPaper?: boolean },
  ): Promise<{ bytes: Uint8Array; base64: string; hex: string }> {
    const receipt = await this.getById(receiptId, actorUserId, actorRoles);
    const template =
      (await this.templates.findByStoreId(receipt.storeId)) ??
      (await this.templateHandler.getOrCreate(receipt.storeId, actorUserId, actorRoles));

    const bytes = renderReceiptEscPos(template.toProps(), receipt.snapshot, options);
    return {
      bytes,
      base64: renderReceiptEscPosBase64(template.toProps(), receipt.snapshot, options),
      hex: renderReceiptEscPosHex(template.toProps(), receipt.snapshot, options),
    };
  }

  public async syncOfflineReceipts(
    input: SyncOfflineReceiptsInput,
  ): Promise<SyncOfflineReceiptsResult> {
    await this.auth.requireReceiptViewer(input.storeId, input.actorUserId, input.actorRoles);

    const results: SyncReceiptResult[] = [];
    let syncedCount = 0;
    let alreadySyncedCount = 0;
    let rejectedCount = 0;

    for (const item of input.items) {
      const clientTransactionId = item.clientTransactionId?.trim();
      if (!clientTransactionId) {
        results.push({
          clientTransactionId: '',
          status: 'REJECTED',
          error: 'clientTransactionId is required for offline sync.',
        });
        rejectedCount++;
        continue;
      }

      // 1. Idempotency check: see if already synced
      const existing = await this.receipts.findByStoreAndSaleId(input.storeId, clientTransactionId);
      if (existing) {
        results.push({
          clientTransactionId,
          status: 'ALREADY_SYNCED',
          receiptId: existing.id.value,
          receiptNumber: existing.receiptNumber,
        });
        alreadySyncedCount++;
        continue;
      }

      // 2. Validate register if specified
      if (item.registerCode) {
        const reg = await this.registers.findByStoreAndCode(input.storeId, item.registerCode);
        if (reg && reg.status !== 'ACTIVE') {
          results.push({
            clientTransactionId,
            status: 'REJECTED',
            error: `Register "${item.registerCode}" is ${reg.status}.`,
          });
          rejectedCount++;
          continue;
        }
      }

      // 3. Create receipt from snapshot
      try {
        const receipt = await this.fromSaleSnapshot({
          storeId: input.storeId,
          actorUserId: input.actorUserId,
          actorRoles: input.actorRoles,
          saleId: clientTransactionId,
          soldAt: new Date(item.soldAt),
          cashierName: item.cashierName,
          ...(item.registerCode !== undefined ? { registerCode: item.registerCode } : {}),
          lines: item.lines,
          subtotalMinor: item.subtotalMinor,
          discountMinor: item.discountMinor,
          taxMinor: item.taxMinor,
          totalMinor: item.totalMinor,
          payments: item.payments,
          changeMinor: item.changeMinor,
          ...(item.currencyCode !== undefined ? { currencyCode: item.currencyCode } : {}),
        });

        results.push({
          clientTransactionId,
          status: 'SYNCED',
          receiptId: receipt.id.value,
          receiptNumber: receipt.receiptNumber,
        });
        syncedCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to process receipt.';
        results.push({
          clientTransactionId,
          status: 'REJECTED',
          error: msg,
        });
        rejectedCount++;
      }
    }

    return {
      totalProcessed: input.items.length,
      syncedCount,
      alreadySyncedCount,
      rejectedCount,
      results,
    };
  }
}
