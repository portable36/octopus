export type ReceiptPaperWidth = 58 | 80;

export type ReceiptStatus = 'REQUESTED' | 'PRINTED' | 'FAILED';

export interface ReceiptTemplateProps {
  readonly storeId: string;
  readonly vendorId: string;
  readonly displayName: string;
  readonly addressLines: readonly string[];
  readonly phone: string | null;
  readonly website: string | null;
  readonly headerLines: readonly string[];
  readonly footerLines: readonly string[];
  readonly thankYouText: string;
  readonly returnsPolicyText: string;
  readonly showSku: boolean;
  readonly showTax: boolean;
  readonly paperWidth: ReceiptPaperWidth;
  readonly locale: string;
  readonly currencyCode: string;
  readonly logoMediaId: string | null;
  readonly version: number;
  readonly updatedAt: Date;
  readonly updatedBy: string | null;
}

export interface ReceiptSaleLine {
  readonly name: string;
  readonly sku?: string | null;
  readonly quantity: number;
  readonly lineTotalMinor: number;
  readonly unitPriceMinor?: number;
}

export interface ReceiptPaymentLine {
  readonly method: string;
  readonly amountPaidMinor: number;
}

export interface ReceiptSaleSnapshot {
  readonly saleId: string;
  readonly receiptNumber: string;
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
  readonly currencyCode: string;
}

export const DEFAULT_THANK_YOU_TEXT = 'THANK YOU FOR SHOPPING!\nWe appreciate you.';

export const DEFAULT_RETURNS_POLICY_TEXT =
  'Returns accepted within 7 days with the\noriginal receipt and subject to store policy.';

export const DEFAULT_FOOTER_LINES = [
  'Please keep this receipt for your',
  'records and returns.',
] as const;
