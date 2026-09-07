import { Inject, Injectable } from '@nestjs/common';
import { ReceiptTemplate } from '../../domain/aggregates/receipt-template.aggregate';
import type { ReceiptTemplateUpdate } from '../../domain/aggregates/receipt-template.aggregate';
import {
  RECEIPT_TEMPLATE_REPOSITORY,
  type ReceiptTemplateRepository,
} from '../ports/receipt-template-repository.interface';
import { PosAuthorizationService } from '../services/pos-authorization.service';
import { buildSampleSaleSnapshot, renderReceiptText } from '../../domain/services/receipt-renderer';
import {
  renderReceiptEscPosBase64,
  renderReceiptEscPosHex,
} from '../../domain/services/escpos-renderer';

export interface ReceiptPreviewResult {
  readonly renderedText: string;
  readonly escposBase64: string;
  readonly escposHex: string;
  readonly templateVersion: number;
}

@Injectable()
export class ReceiptTemplateHandler {
  constructor(
    @Inject(RECEIPT_TEMPLATE_REPOSITORY)
    private readonly templates: ReceiptTemplateRepository,
    @Inject(PosAuthorizationService) private readonly auth: PosAuthorizationService,
  ) {}

  public async getOrCreate(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<ReceiptTemplate> {
    const store = await this.auth.requireReceiptViewer(storeId, actorUserId, actorRoles);
    const existing = await this.templates.findByStoreId(storeId);
    if (existing) {
      return existing;
    }

    const created = ReceiptTemplate.createDefault({
      storeId: store.storeId,
      vendorId: store.vendorId,
      displayName: store.displayName,
      addressLines: [
        store.addressLine1,
        [store.city, store.region].filter(Boolean).join(', '),
      ].filter((line): line is string => Boolean(line && line.trim())),
      locale: store.locale,
      currencyCode: store.currencyCode,
      actorUserId,
    });
    await this.templates.save(created);
    return created;
  }

  public async update(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    patch: ReceiptTemplateUpdate,
  ): Promise<ReceiptTemplate> {
    await this.auth.requireTemplateManager(storeId, actorUserId, actorRoles);
    const template = await this.getOrCreate(storeId, actorUserId, actorRoles);
    template.update(patch, actorUserId);
    await this.templates.save(template);
    return template;
  }

  public async preview(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<ReceiptPreviewResult> {
    const template = await this.getOrCreate(storeId, actorUserId, actorRoles);
    const sample = buildSampleSaleSnapshot(template.currencyCode);
    return {
      renderedText: renderReceiptText(template.toProps(), sample),
      escposBase64: renderReceiptEscPosBase64(template.toProps(), sample),
      escposHex: renderReceiptEscPosHex(template.toProps(), sample),
      templateVersion: template.version,
    };
  }
}
