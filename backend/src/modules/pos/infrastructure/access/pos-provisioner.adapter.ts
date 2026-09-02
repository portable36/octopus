import { Inject, Injectable } from '@nestjs/common';
import type {
  PosProvisionerPort,
  PosProvisionInput,
  ProvisionerResult,
} from '../../../../shared-kernel/application/ports/pos-provisioner.port';
import { ReceiptTemplate } from '../../domain/aggregates/receipt-template.aggregate';
import {
  RECEIPT_TEMPLATE_REPOSITORY,
  type ReceiptTemplateRepository,
} from '../../application/ports/receipt-template-repository.interface';

@Injectable()
export class PosProvisionerAdapter implements PosProvisionerPort {
  constructor(
    @Inject(RECEIPT_TEMPLATE_REPOSITORY) private readonly templates: ReceiptTemplateRepository,
  ) {}

  public async provision(input: PosProvisionInput): Promise<ProvisionerResult> {
    try {
      const existing = await this.templates.findByStoreId(input.storeId);
      if (existing) {
        return { success: true };
      }
      const created = ReceiptTemplate.createDefault({
        storeId: input.storeId,
        vendorId: input.vendorId,
        displayName: input.displayName,
        addressLines: [...input.addressLines],
        locale: input.locale,
        currencyCode: input.currencyCode,
        actorUserId: input.actorUserId,
      });
      await this.templates.save(created);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'POS provisioning failed.';
      return { success: false, error: message };
    }
  }
}
