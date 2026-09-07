import { InvalidReceiptSnapshotError } from '../errors/pos.errors';
import type { ReceiptSaleSnapshot, ReceiptTemplateProps } from '../receipt.types';

export interface EscPosOptions {
  /** If true, emits command to trigger cash drawer kick-out (ESC p 0) */
  readonly kickCashDrawer?: boolean;
  /** If true, emits paper cut command (GS V 65 3). Defaults to true. */
  readonly cutPaper?: boolean;
  /** Number of blank feed lines before paper cut. Defaults to 3. */
  readonly feedLinesBeforeCut?: number;
}

const WIDTH: Record<58 | 80, number> = {
  58: 32,
  80: 42,
};

// ESC/POS Command Constants
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const CMD = {
  INIT: [ESC, 0x40], // ESC @
  CODEPAGE_PC437: [ESC, 0x74, 0x00], // ESC t 0
  ALIGN_LEFT: [ESC, 0x61, 0x00], // ESC a 0
  ALIGN_CENTER: [ESC, 0x61, 0x01], // ESC a 1
  ALIGN_RIGHT: [ESC, 0x61, 0x02], // ESC a 2
  BOLD_ON: [ESC, 0x45, 0x01], // ESC E 1
  BOLD_OFF: [ESC, 0x45, 0x00], // ESC E 0
  TEXT_NORMAL: [GS, 0x21, 0x00], // GS ! 0
  TEXT_DOUBLE_HEIGHT: [GS, 0x21, 0x01], // GS ! 1
  TEXT_DOUBLE_SIZE: [GS, 0x21, 0x11], // GS ! 17 (2x width + 2x height)
  DRAWER_KICK: [ESC, 0x70, 0x00, 0x19, 0xfa], // ESC p 0 25 250 (pulse drawer pin 2)
  FEED_AND_CUT: (lines: number) => [GS, 0x56, 0x41, Math.min(Math.max(lines, 0), 10)], // GS V 'A' n
};

class EscPosBuilder {
  private readonly buffer: number[] = [];

  constructor() {
    this.buffer.push(...CMD.INIT);
    this.buffer.push(...CMD.CODEPAGE_PC437);
  }

  public align(alignment: 'left' | 'center' | 'right'): this {
    if (alignment === 'center') {
      this.buffer.push(...CMD.ALIGN_CENTER);
    } else if (alignment === 'right') {
      this.buffer.push(...CMD.ALIGN_RIGHT);
    } else {
      this.buffer.push(...CMD.ALIGN_LEFT);
    }
    return this;
  }

  public bold(enabled: boolean): this {
    this.buffer.push(...(enabled ? CMD.BOLD_ON : CMD.BOLD_OFF));
    return this;
  }

  public size(size: 'normal' | 'double-height' | 'double-size'): this {
    if (size === 'double-size') {
      this.buffer.push(...CMD.TEXT_DOUBLE_SIZE);
    } else if (size === 'double-height') {
      this.buffer.push(...CMD.TEXT_DOUBLE_HEIGHT);
    } else {
      this.buffer.push(...CMD.TEXT_NORMAL);
    }
    return this;
  }

  public text(str: string): this {
    const bytes = Buffer.from(str, 'ascii');
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b !== undefined) {
        this.buffer.push(b);
      }
    }
    return this;
  }

  public line(str = ''): this {
    if (str.length > 0) {
      this.text(str);
    }
    this.buffer.push(LF);
    return this;
  }

  public divider(char: string, width: number): this {
    this.align('left');
    this.size('normal');
    this.bold(false);
    this.line(char.repeat(width));
    return this;
  }

  public drawerKick(): this {
    this.buffer.push(...CMD.DRAWER_KICK);
    return this;
  }

  public cut(feedLines = 3): this {
    this.buffer.push(...CMD.FEED_AND_CUT(feedLines));
    return this;
  }

  public toUint8Array(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

export function renderReceiptEscPos(
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
  options: EscPosOptions = {},
): Uint8Array {
  assertSnapshot(sale);
  const width = WIDTH[template.paperWidth];
  const builder = new EscPosBuilder();

  if (options.kickCashDrawer) {
    builder.drawerKick();
  }

  // Header & Branding
  builder.align('center');
  builder.size('double-size');
  builder.bold(true);
  builder.line(template.displayName.toUpperCase());
  builder.size('normal');
  builder.bold(false);

  const contact = [template.addressLines.join(' • '), template.phone, template.website]
    .filter((part) => part && part.trim().length > 0)
    .join(' • ');

  if (contact) {
    for (const wrapped of wrapText(contact, width)) {
      builder.line(wrapped);
    }
  }

  builder.divider('=', width);
  builder.align('center');
  builder.bold(true);
  builder.line('SALES RECEIPT');
  builder.bold(false);
  builder.divider('-', width);

  // Metadata
  builder.align('left');
  builder.line(`Receipt No : ${sale.receiptNumber}`);
  builder.line(`Date       : ${formatDate(sale.soldAt, template.locale)}`);
  builder.line(`Cashier    : ${sale.cashierName}`);
  if (sale.registerCode) {
    builder.line(`Register   : ${sale.registerCode}`);
  }
  for (const header of template.headerLines) {
    builder.line(header);
  }

  // Column Headers
  builder.divider('-', width);
  builder.line(padColumns('ITEM', 'QTY', 'AMOUNT', width));
  builder.divider('-', width);

  // Line Items
  for (const line of sale.lines) {
    const name = template.showSku && line.sku ? `${line.name} (${line.sku})` : line.name;
    const amount = formatMoney(
      line.lineTotalMinor,
      sale.currencyCode || template.currencyCode,
      template.locale,
    );
    builder.line(
      padColumns(truncateText(name, Math.max(8, width - 16)), String(line.quantity), amount, width),
    );
  }

  // Totals
  builder.divider('-', width);
  builder.line(
    rightPair(
      'Subtotal',
      formatMoney(sale.subtotalMinor, sale.currencyCode || template.currencyCode, template.locale),
      width,
    ),
  );

  if (sale.discountMinor > 0) {
    builder.line(
      rightPair(
        'Discount',
        `-${formatMoney(sale.discountMinor, sale.currencyCode || template.currencyCode, template.locale)}`,
        width,
      ),
    );
  }

  if (template.showTax || sale.taxMinor > 0) {
    builder.line(
      rightPair(
        'Tax',
        formatMoney(sale.taxMinor, sale.currencyCode || template.currencyCode, template.locale),
        width,
      ),
    );
  }

  builder.divider('-', width);
  builder.bold(true);
  builder.size('double-height');
  builder.line(
    rightPair(
      'TOTAL',
      formatMoney(sale.totalMinor, sale.currencyCode || template.currencyCode, template.locale),
      width,
    ),
  );
  builder.size('normal');
  builder.bold(false);
  builder.divider('=', width);

  // Payments
  builder.align('left');
  builder.line('PAYMENT');
  builder.divider('-', width);
  for (const payment of sale.payments) {
    builder.line(`Payment Method : ${payment.method}`);
    builder.line(
      `Amount Paid    : ${formatMoney(payment.amountPaidMinor, sale.currencyCode || template.currencyCode, template.locale)}`,
    );
  }
  if (sale.changeMinor > 0) {
    builder.line(
      `Change         : ${formatMoney(sale.changeMinor, sale.currencyCode || template.currencyCode, template.locale)}`,
    );
  }
  builder.divider('=', width);

  // Thank You & Policies
  builder.align('center');
  builder.line('');
  for (const thank of template.thankYouText.split('\n')) {
    builder.line(thank.trim());
  }

  if (template.returnsPolicyText.trim()) {
    builder.line('');
    builder.divider('-', width);
    builder.bold(true);
    builder.line('RETURNS & EXCHANGES');
    builder.bold(false);
    builder.divider('-', width);
    builder.align('left');
    for (const policy of template.returnsPolicyText.split('\n')) {
      for (const wrapped of wrapText(policy.trim(), width)) {
        builder.line(wrapped);
      }
    }
  }

  if (template.footerLines.length > 0) {
    builder.line('');
    builder.divider('=', width);
    builder.align('center');
    for (const footer of template.footerLines) {
      for (const wrapped of wrapText(footer, width)) {
        builder.line(wrapped);
      }
    }
    builder.divider('=', width);
  }

  // Paper cut
  const cutPaper = options.cutPaper ?? true;
  if (cutPaper) {
    builder.cut(options.feedLinesBeforeCut ?? 3);
  }

  return builder.toUint8Array();
}

export function renderReceiptEscPosBase64(
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
  options: EscPosOptions = {},
): string {
  const bytes = renderReceiptEscPos(template, sale, options);
  return Buffer.from(bytes).toString('base64');
}

export function renderReceiptEscPosHex(
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
  options: EscPosOptions = {},
): string {
  const bytes = renderReceiptEscPos(template, sale, options);
  return Buffer.from(bytes).toString('hex');
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

function formatMoney(minor: number, _currencyCode: string, locale: string): string {
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

function padColumns(left: string, mid: string, right: string, width: number): string {
  const midWidth = 4;
  const rightWidth = 10;
  const leftWidth = Math.max(8, width - midWidth - rightWidth - 2);
  return `${truncateText(left, leftWidth).padEnd(leftWidth)} ${mid.padStart(midWidth)} ${right.padStart(rightWidth)}`;
}

function rightPair(left: string, right: string, width: number): string {
  const space = width - left.length - right.length;
  if (space < 1) {
    return `${left}\n${' '.repeat(Math.max(0, width - right.length))}${right}`;
  }
  return `${left}${' '.repeat(space)}${right}`;
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLen - 1))}…`;
}

function wrapText(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let current = '';

  for (const word of words) {
    if (!word) continue;
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= width) {
      current += ` ${word}`;
    } else {
      out.push(current);
      current = word;
    }
  }
  if (current.length > 0) {
    out.push(current);
  }
  return out;
}
