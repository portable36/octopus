import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { ReceiptTemplate } from '../../domain/aggregates/receipt-template.aggregate';
import type { ReceiptPaperWidth } from '../../domain/receipt.types';
import { ReceiptTemplateOrmEntity } from './receipt-template.orm-entity';

export function templateToDomain(entity: ReceiptTemplateOrmEntity): ReceiptTemplate {
  return ReceiptTemplate.reconstitute(UniqueID.from(entity.id), {
    storeId: entity.storeId,
    vendorId: entity.vendorId,
    displayName: entity.displayName,
    addressLines: entity.addressLines ?? [],
    phone: entity.phone,
    website: entity.website,
    headerLines: entity.headerLines ?? [],
    footerLines: entity.footerLines ?? [],
    thankYouText: entity.thankYouText,
    returnsPolicyText: entity.returnsPolicyText,
    showSku: entity.showSku,
    showTax: entity.showTax,
    paperWidth: entity.paperWidth as ReceiptPaperWidth,
    locale: entity.locale,
    currencyCode: entity.currencyCode,
    logoMediaId: entity.logoMediaId,
    version: entity.version,
    updatedAt: entity.updatedAt,
    updatedBy: entity.updatedBy,
  });
}

export function applyTemplateToOrm(
  template: ReceiptTemplate,
  entity: ReceiptTemplateOrmEntity,
): void {
  const props = template.toProps();
  entity.id = template.id.value;
  entity.storeId = props.storeId;
  entity.vendorId = props.vendorId;
  entity.displayName = props.displayName;
  entity.addressLines = [...props.addressLines];
  entity.phone = props.phone;
  entity.website = props.website;
  entity.headerLines = [...props.headerLines];
  entity.footerLines = [...props.footerLines];
  entity.thankYouText = props.thankYouText;
  entity.returnsPolicyText = props.returnsPolicyText;
  entity.showSku = props.showSku;
  entity.showTax = props.showTax;
  entity.paperWidth = props.paperWidth;
  entity.locale = props.locale;
  entity.currencyCode = props.currencyCode;
  entity.logoMediaId = props.logoMediaId;
  entity.version = props.version;
  entity.updatedAt = props.updatedAt;
  entity.updatedBy = props.updatedBy;
}
