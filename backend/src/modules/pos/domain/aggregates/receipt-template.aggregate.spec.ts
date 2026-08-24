import { describe, expect, it } from 'vitest';
import { ReceiptTemplate } from './receipt-template.aggregate';
import { buildSampleSaleSnapshot, renderReceiptText } from '../services/receipt-renderer';
import { formatReceiptNumber, Receipt } from './receipt.aggregate';

describe('ReceiptTemplate', () => {
  it('creates defaults matching the sample thank-you and returns copy', () => {
    const template = ReceiptTemplate.createDefault({
      storeId: '00000000-0000-7000-8000-000000000010',
      vendorId: '00000000-0000-7000-8000-000000000020',
      displayName: 'Store Name',
      addressLines: ['Address'],
      phone: 'Phone',
      website: 'Website',
    });

    expect(template.version).toBe(1);
    expect(template.thankYouText).toContain('THANK YOU FOR SHOPPING');
    expect(template.returnsPolicyText).toContain('7 days');
    expect(template.paperWidth).toBe(80);
  });

  it('rejects HTML and control characters in custom fields', () => {
    const template = ReceiptTemplate.createDefault({
      storeId: '00000000-0000-7000-8000-000000000010',
      vendorId: '00000000-0000-7000-8000-000000000020',
      displayName: 'Store Name',
    });

    expect(() =>
      template.update({ thankYouText: 'Thanks <script>alert(1)</script>' }, 'actor'),
    ).not.toThrow();
    expect(template.thankYouText).not.toContain('<');
    expect(() => template.update({ displayName: 'A' }, 'actor')).toThrow(/at least 2/);
  });

  it('bumps version on update', () => {
    const template = ReceiptTemplate.createDefault({
      storeId: '00000000-0000-7000-8000-000000000010',
      vendorId: '00000000-0000-7000-8000-000000000020',
      displayName: 'Store Name',
    });
    template.update({ displayName: 'Updated Store' }, 'actor-1');
    expect(template.version).toBe(2);
    expect(template.displayName).toBe('Updated Store');
  });
});

describe('renderReceiptText', () => {
  it('renders the sample sales receipt layout', () => {
    const template = ReceiptTemplate.createDefault({
      storeId: '00000000-0000-7000-8000-000000000010',
      vendorId: '00000000-0000-7000-8000-000000000020',
      displayName: 'Store Name',
      addressLines: ['Address'],
      phone: 'Phone',
      website: 'Website',
      currencyCode: 'BDT',
    });
    const text = renderReceiptText(template.toProps(), buildSampleSaleSnapshot('BDT'));

    expect(text).toContain('STORE NAME');
    expect(text).toContain('SALES RECEIPT');
    expect(text).toContain('POS-20260531-00125');
    expect(text).toContain('Oversized Tee');
    expect(text).toContain('Cap');
    expect(text).toContain('TOTAL');
    expect(text).toContain('CASH');
    expect(text).toContain('THANK YOU FOR SHOPPING');
    expect(text).toContain('RETURNS & EXCHANGES');
  });

  it('omits tax when showTax is false and tax is zero', () => {
    const template = ReceiptTemplate.createDefault({
      storeId: '00000000-0000-7000-8000-000000000010',
      vendorId: '00000000-0000-7000-8000-000000000020',
      displayName: 'Store Name',
    });
    const text = renderReceiptText(template.toProps(), buildSampleSaleSnapshot('BDT'));
    expect(text).not.toMatch(/\nTax\s/);
  });
});

describe('Receipt', () => {
  it('formats receipt numbers as POS-yyyyMMdd-seq', () => {
    expect(formatReceiptNumber(new Date('2026-05-31T08:00:00.000Z'), 125)).toBe(
      'POS-20260531-00125',
    );
  });

  it('freezes snapshot amounts for reprint', () => {
    const template = ReceiptTemplate.createDefault({
      storeId: '00000000-0000-7000-8000-000000000010',
      vendorId: '00000000-0000-7000-8000-000000000020',
      displayName: 'Store Name',
    });
    const snapshot = buildSampleSaleSnapshot('BDT');
    const rendered = renderReceiptText(template.toProps(), snapshot);
    const receipt = Receipt.create({
      storeId: template.storeId,
      vendorId: template.vendorId,
      saleId: snapshot.saleId,
      receiptNumber: snapshot.receiptNumber,
      templateId: template.id.value,
      templateVersionUsed: template.version,
      snapshot,
      renderedText: rendered,
      createdBy: 'cashier-1',
    });

    expect(receipt.status).toBe('REQUESTED');
    expect(receipt.snapshot.totalMinor).toBe(270_000);
    receipt.markPrinted();
    expect(receipt.status).toBe('PRINTED');
    expect(receipt.renderedText).toBe(rendered);
  });
});
