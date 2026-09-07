import { describe, expect, it } from 'vitest';
import type { ReceiptSaleSnapshot, ReceiptTemplateProps } from '../receipt.types';
import {
  renderReceiptEscPos,
  renderReceiptEscPosBase64,
  renderReceiptEscPosHex,
} from './escpos-renderer';

const sampleTemplate: Pick<
  ReceiptTemplateProps,
  | 'displayName'
  | 'addressLines'
  | 'phone'
  | 'website'
  | 'headerLines'
  | 'footerLines'
  | 'thankYouText'
  | 'returnsPolicyText'
  | 'showSku'
  | 'showTax'
  | 'paperWidth'
  | 'locale'
  | 'currencyCode'
> = {
  displayName: 'Octopus Flagship',
  addressLines: ['House 12, Road 4', 'Dhanmondi, Dhaka'],
  phone: '+8801700000000',
  website: 'https://octopus.local',
  headerLines: ['BIN: 123456789-0101', 'Tax Invoice'],
  footerLines: ['Keep this receipt for warranty claims.'],
  thankYouText: 'THANK YOU FOR SHOPPING!\nVisit us again.',
  returnsPolicyText: 'Exchange within 7 days with original receipt.',
  showSku: true,
  showTax: true,
  paperWidth: 80,
  locale: 'en-US',
  currencyCode: 'BDT',
};

const sampleSale: ReceiptSaleSnapshot = {
  saleId: '00000000-0000-7000-8000-000000000001',
  receiptNumber: 'POS-20260907-0001',
  soldAt: new Date('2026-09-07T14:30:00.000Z'),
  cashierName: 'Rahim Cashier',
  registerCode: 'REG-01',
  lines: [
    { name: 'Cotton Shirt', sku: 'SHT-01', quantity: 2, lineTotalMinor: 200_000 },
    { name: 'Leather Belt', sku: 'BLT-02', quantity: 1, lineTotalMinor: 50_000 },
  ],
  subtotalMinor: 250_000,
  discountMinor: 25_000,
  taxMinor: 11_250,
  totalMinor: 236_250,
  payments: [{ method: 'CASH', amountPaidMinor: 250_000 }],
  changeMinor: 13_750,
  currencyCode: 'BDT',
};

describe('ESC/POS Receipt Renderer', () => {
  it('generates a non-empty binary buffer containing printer initialization and text', () => {
    const bytes = renderReceiptEscPos(sampleTemplate, sampleSale);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(100);

    // Initial ESC @ (0x1B, 0x40)
    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x40);

    const asciiString = Buffer.from(bytes).toString('ascii');
    expect(asciiString).toContain('OCTOPUS FLAGSHIP');
    expect(asciiString).toContain('POS-20260907-0001');
    expect(asciiString).toContain('Rahim Cashier');
    expect(asciiString).toContain('Cotton Shirt');
    expect(asciiString).toContain('TOTAL');
    expect(asciiString).toContain('CASH');
  });

  it('supports 58mm paper width formatting without error', () => {
    const bytes58 = renderReceiptEscPos({ ...sampleTemplate, paperWidth: 58 }, sampleSale);
    expect(bytes58.length).toBeGreaterThan(100);
    const asciiString = Buffer.from(bytes58).toString('ascii');
    expect(asciiString).toContain('SALES RECEIPT');
  });

  it('includes cash drawer kick command when requested', () => {
    const withoutKick = renderReceiptEscPos(sampleTemplate, sampleSale, { kickCashDrawer: false });
    const withKick = renderReceiptEscPos(sampleTemplate, sampleSale, { kickCashDrawer: true });

    // Drawer kick sequence: ESC p 0 25 250 (0x1B, 0x70, 0x00, 0x19, 0xFA)
    const kickPattern = [0x1b, 0x70, 0x00, 0x19, 0xfa];
    const containsKick = (buf: Uint8Array) => Buffer.from(buf).includes(Buffer.from(kickPattern));

    expect(containsKick(withoutKick)).toBe(false);
    expect(containsKick(withKick)).toBe(true);
  });

  it('includes paper cut command by default', () => {
    const bytes = renderReceiptEscPos(sampleTemplate, sampleSale, { cutPaper: true });
    // GS V 'A' n (0x1D, 0x56, 0x41)
    const cutPattern = [0x1d, 0x56, 0x41];
    expect(Buffer.from(bytes).includes(Buffer.from(cutPattern))).toBe(true);
  });

  it('encodes valid base64 and hex strings', () => {
    const b64 = renderReceiptEscPosBase64(sampleTemplate, sampleSale);
    expect(typeof b64).toBe('string');
    expect(b64.length).toBeGreaterThan(0);
    const decoded = Buffer.from(b64, 'base64');
    expect(decoded[0]).toBe(0x1b);
    expect(decoded[1]).toBe(0x40);

    const hex = renderReceiptEscPosHex(sampleTemplate, sampleSale);
    expect(typeof hex).toBe('string');
    expect(hex.startsWith('1b40')).toBe(true);
  });

  it('validates receipt snapshot invariants', () => {
    expect(() =>
      renderReceiptEscPos(sampleTemplate, {
        ...sampleSale,
        lines: [],
      }),
    ).toThrow('Sale must include at least one line.');

    expect(() =>
      renderReceiptEscPos(sampleTemplate, {
        ...sampleSale,
        receiptNumber: '',
      }),
    ).toThrow('Receipt number is required.');
  });
});
