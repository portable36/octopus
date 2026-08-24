import { InvalidReceiptSnapshotError } from '../errors/pos.errors';
import type { ReceiptSaleSnapshot, ReceiptTemplateProps } from '../receipt.types';

const WIDTH: Record<58 | 80, number> = {
  58: 32,
  80: 42,
};

export function renderReceiptText(
  template: Pick<
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
  >,
  sale: ReceiptSaleSnapshot,
): string {
  assertSnapshot(sale);
  const width = WIDTH[template.paperWidth];
  const lines: string[] = [];

  lines.push(repeat('=', width));
  lines.push(center(template.displayName.toUpperCase(), width));
  const contact = [template.addressLines.join(' • '), template.phone, template.website]
    .filter((part) => part && part.trim().length > 0)
    .join(' • ');
  if (contact) {
    for (const wrapped of wrap(contact, width)) {
      lines.push(center(wrapped, width));
    }
  }
  lines.push(repeat('=', width));
  lines.push('');
  lines.push(center('SALES RECEIPT', width));
  lines.push(repeat('-', width));
  lines.push(`Receipt No : ${sale.receiptNumber}`);
  lines.push(`Date       : ${formatDate(sale.soldAt, template.locale)}`);
  lines.push(`Cashier    : ${sale.cashierName}`);
  if (sale.registerCode) {
    lines.push(`Register   : ${sale.registerCode}`);
  }
  for (const header of template.headerLines) {
    lines.push(header);
  }
  lines.push(repeat('-', width));
  lines.push(padColumns('ITEM', 'QTY', 'AMOUNT', width));
  lines.push(repeat('-', width));

  for (const line of sale.lines) {
    const name = template.showSku && line.sku ? `${line.name} (${line.sku})` : line.name;
    const amount = formatMoney(
      line.lineTotalMinor,
      sale.currencyCode || template.currencyCode,
      template.locale,
    );
    lines.push(
      padColumns(truncate(name, Math.max(8, width - 16)), String(line.quantity), amount, width),
    );
  }

  lines.push(repeat('-', width));
  lines.push(
    rightPair(
      'Subtotal',
      formatMoney(sale.subtotalMinor, sale.currencyCode || template.currencyCode, template.locale),
      width,
    ),
  );
  if (sale.discountMinor > 0) {
    lines.push(
      rightPair(
        'Discount',
        `-${formatMoney(sale.discountMinor, sale.currencyCode || template.currencyCode, template.locale)}`,
        width,
      ),
    );
  }
  if (template.showTax || sale.taxMinor > 0) {
    lines.push(
      rightPair(
        'Tax',
        formatMoney(sale.taxMinor, sale.currencyCode || template.currencyCode, template.locale),
        width,
      ),
    );
  }
  lines.push(repeat('-', width));
  lines.push(
    rightPair(
      'TOTAL',
      formatMoney(sale.totalMinor, sale.currencyCode || template.currencyCode, template.locale),
      width,
    ),
  );
  lines.push(repeat('=', width));
  lines.push('');
  lines.push('PAYMENT');
  lines.push(repeat('-', width));
  for (const payment of sale.payments) {
    lines.push(`Payment Method : ${payment.method}`);
    lines.push(
      `Amount Paid    : ${formatMoney(payment.amountPaidMinor, sale.currencyCode || template.currencyCode, template.locale)}`,
    );
  }
  if (sale.changeMinor > 0) {
    lines.push(
      `Change         : ${formatMoney(sale.changeMinor, sale.currencyCode || template.currencyCode, template.locale)}`,
    );
  }
  lines.push(repeat('=', width));
  lines.push('');
  for (const thank of template.thankYouText.split('\n')) {
    lines.push(center(thank.trim(), width));
  }
  lines.push('');
  lines.push(repeat('-', width));
  lines.push(center('RETURNS & EXCHANGES', width));
  lines.push(repeat('-', width));
  for (const policy of template.returnsPolicyText.split('\n')) {
    for (const wrapped of wrap(policy.trim(), width)) {
      lines.push(wrapped);
    }
  }
  lines.push('');
  lines.push(repeat('=', width));
  for (const footer of template.footerLines) {
    for (const wrapped of wrap(footer, width)) {
      lines.push(center(wrapped, width));
    }
  }
  lines.push(repeat('=', width));

  return lines.join('\n');
}

export function buildSampleSaleSnapshot(currencyCode: string): ReceiptSaleSnapshot {
  return {
    saleId: '00000000-0000-7000-8000-000000000001',
    receiptNumber: 'POS-20260531-00125',
    soldAt: new Date('2026-05-31T14:35:00.000Z'),
    cashierName: 'Admin',
    registerCode: 'REG-1',
    lines: [
      { name: 'Oversized Tee', quantity: 2, lineTotalMinor: 240_000 },
      { name: 'Cap', quantity: 1, lineTotalMinor: 45_000 },
    ],
    subtotalMinor: 285_000,
    discountMinor: 15_000,
    taxMinor: 0,
    totalMinor: 270_000,
    payments: [{ method: 'CASH', amountPaidMinor: 300_000 }],
    changeMinor: 30_000,
    currencyCode,
  };
}

function assertSnapshot(sale: ReceiptSaleSnapshot): void {
  if (!sale.receiptNumber.trim()) {
    throw new InvalidReceiptSnapshotError('Receipt number is required.');
  }
  if (!sale.cashierName.trim()) {
    throw new InvalidReceiptSnapshotError('Cashier name is required.');
  }
  if (sale.lines.length === 0) {
    throw new InvalidReceiptSnapshotError('Sale must include at least one line.');
  }
  for (const line of sale.lines) {
    if (line.quantity <= 0 || line.lineTotalMinor < 0) {
      throw new InvalidReceiptSnapshotError(
        'Sale lines must have positive quantity and non-negative totals.',
      );
    }
  }
  if (
    sale.totalMinor < 0 ||
    sale.subtotalMinor < 0 ||
    sale.discountMinor < 0 ||
    sale.taxMinor < 0
  ) {
    throw new InvalidReceiptSnapshotError('Money amounts cannot be negative.');
  }
  if (sale.payments.length === 0) {
    throw new InvalidReceiptSnapshotError('Sale must include at least one payment.');
  }
}

function formatMoney(minor: number, currencyCode: string, locale: string): string {
  const major = minor / 100;
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return major.toFixed(2);
  }
}

function formatDate(date: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function repeat(char: string, width: number): string {
  return char.repeat(width);
}

function center(text: string, width: number): string {
  if (text.length >= width) {
    return text.slice(0, width);
  }
  const pad = Math.floor((width - text.length) / 2);
  return `${' '.repeat(pad)}${text}`.padEnd(width, ' ');
}

function padColumns(left: string, mid: string, right: string, width: number): string {
  const midWidth = 4;
  const rightWidth = 10;
  const leftWidth = Math.max(8, width - midWidth - rightWidth - 2);
  return `${truncate(left, leftWidth).padEnd(leftWidth)} ${mid.padStart(midWidth)} ${right.padStart(rightWidth)}`;
}

function rightPair(label: string, value: string, width: number): string {
  const gap = Math.max(1, width - label.length - value.length);
  return `${label}${' '.repeat(gap)}${value}`;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
}

function wrap(text: string, width: number): string[] {
  if (!text) {
    return [];
  }
  const words = text.split(/\s+/);
  const rows: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if (`${current} ${word}`.length <= width) {
      current = `${current} ${word}`;
    } else {
      rows.push(current);
      current = word;
    }
  }
  if (current) {
    rows.push(current);
  }
  return rows;
}
