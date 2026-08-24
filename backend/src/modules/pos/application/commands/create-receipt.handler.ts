import { Inject, Injectable } from '@nestjs/common';
import { Receipt } from '../../domain/aggregates/receipt.aggregate';
import type { ReceiptSaleLine, ReceiptPaymentLine } from '../../domain/receipt.types';
import { renderReceiptText } from '../../domain/services/receipt-renderer';
import { RECEIPT_REPOSITORY, type ReceiptRepository } from '../ports/receipt-repository.interface';
import {
  RECEIPT_TEMPLATE_REPOSITORY,
  type ReceiptTemplateRepository,
} from '../ports/receipt-template-repository.interface';
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

@Injectable()
export class CreateReceiptHandler {
  constructor(
    @Inject(RECEIPT_REPOSITORY) private readonly receipts: ReceiptRepository,
    @Inject(RECEIPT_TEMPLATE_REPOSITORY)
    private readonly templates: ReceiptTemplateRepository,
    private readonly auth: PosAuthorizationService,
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
}
