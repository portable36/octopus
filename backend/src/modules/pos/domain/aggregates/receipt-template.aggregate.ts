import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { InvalidReceiptTemplateError } from '../errors/pos.errors';
import {
  DEFAULT_FOOTER_LINES,
  DEFAULT_RETURNS_POLICY_TEXT,
  DEFAULT_THANK_YOU_TEXT,
  type ReceiptPaperWidth,
  type ReceiptTemplateProps,
} from '../receipt.types';

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function sanitizeLine(raw: string, maxLen: number, field: string): string {
  const cleaned = raw.replace(CONTROL_CHARS, '').replace(/[<>]/g, '').trim();
  if (cleaned.length > maxLen) {
    throw new InvalidReceiptTemplateError(`${field} must be at most ${maxLen} characters.`);
  }
  return cleaned;
}

function sanitizeLines(
  lines: readonly string[] | undefined,
  maxLines: number,
  maxLen: number,
  field: string,
): string[] {
  if (!lines) {
    return [];
  }
  if (lines.length > maxLines) {
    throw new InvalidReceiptTemplateError(`${field} supports at most ${maxLines} lines.`);
  }
  return lines
    .map((line, index) => sanitizeLine(line, maxLen, `${field}[${index}]`))
    .filter(Boolean);
}

export type ReceiptTemplateUpdate = {
  readonly displayName?: string;
  readonly addressLines?: readonly string[];
  readonly phone?: string | null;
  readonly website?: string | null;
  readonly headerLines?: readonly string[];
  readonly footerLines?: readonly string[];
  readonly thankYouText?: string;
  readonly returnsPolicyText?: string;
  readonly showSku?: boolean;
  readonly showTax?: boolean;
  readonly paperWidth?: ReceiptPaperWidth;
  readonly locale?: string;
  readonly currencyCode?: string;
  readonly logoMediaId?: string | null;
};

export class ReceiptTemplate extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: ReceiptTemplateProps,
  ) {
    super(id);
  }

  public static createDefault(input: {
    readonly storeId: string;
    readonly vendorId: string;
    readonly displayName: string;
    readonly addressLines?: readonly string[];
    readonly phone?: string | null;
    readonly website?: string | null;
    readonly locale?: string;
    readonly currencyCode?: string;
    readonly actorUserId?: string | null;
  }): ReceiptTemplate {
    const displayName = sanitizeLine(input.displayName, 160, 'displayName');
    if (displayName.length < 2) {
      throw new InvalidReceiptTemplateError('Display name must be at least 2 characters.');
    }

    const template = new ReceiptTemplate(UniqueID.create(), {
      storeId: input.storeId,
      vendorId: input.vendorId,
      displayName,
      addressLines: sanitizeLines(input.addressLines, 4, 120, 'addressLines'),
      phone: input.phone ? sanitizeLine(input.phone, 40, 'phone') : null,
      website: input.website ? sanitizeLine(input.website, 120, 'website') : null,
      headerLines: [],
      footerLines: [...DEFAULT_FOOTER_LINES],
      thankYouText: DEFAULT_THANK_YOU_TEXT,
      returnsPolicyText: DEFAULT_RETURNS_POLICY_TEXT,
      showSku: false,
      showTax: false,
      paperWidth: 80,
      locale: sanitizeLine(input.locale ?? 'en-BD', 16, 'locale'),
      currencyCode: sanitizeLine((input.currencyCode ?? 'BDT').toUpperCase(), 3, 'currencyCode'),
      logoMediaId: null,
      version: 1,
      updatedAt: new Date(),
      updatedBy: input.actorUserId ?? null,
    });

    template.addEvent('ReceiptTemplateCreated', {
      templateId: template.id.value,
      storeId: template.storeId,
      vendorId: template.vendorId,
    });
    return template;
  }

  public static reconstitute(id: UniqueID, props: ReceiptTemplateProps): ReceiptTemplate {
    return new ReceiptTemplate(id, props);
  }

  public update(patch: ReceiptTemplateUpdate, actorUserId: string): void {
    const nextDisplayName =
      patch.displayName !== undefined
        ? sanitizeLine(patch.displayName, 160, 'displayName')
        : this.props.displayName;
    if (nextDisplayName.length < 2) {
      throw new InvalidReceiptTemplateError('Display name must be at least 2 characters.');
    }

    const paperWidth = patch.paperWidth ?? this.props.paperWidth;
    if (paperWidth !== 58 && paperWidth !== 80) {
      throw new InvalidReceiptTemplateError('paperWidth must be 58 or 80.');
    }

    const thankYouText =
      patch.thankYouText !== undefined
        ? sanitizeMultiline(patch.thankYouText, 400, 'thankYouText')
        : this.props.thankYouText;
    const returnsPolicyText =
      patch.returnsPolicyText !== undefined
        ? sanitizeMultiline(patch.returnsPolicyText, 800, 'returnsPolicyText')
        : this.props.returnsPolicyText;

    this.props = {
      ...this.props,
      displayName: nextDisplayName,
      addressLines:
        patch.addressLines !== undefined
          ? sanitizeLines(patch.addressLines, 4, 120, 'addressLines')
          : this.props.addressLines,
      phone:
        patch.phone === undefined
          ? this.props.phone
          : patch.phone === null
            ? null
            : sanitizeLine(patch.phone, 40, 'phone'),
      website:
        patch.website === undefined
          ? this.props.website
          : patch.website === null
            ? null
            : sanitizeLine(patch.website, 120, 'website'),
      headerLines:
        patch.headerLines !== undefined
          ? sanitizeLines(patch.headerLines, 4, 80, 'headerLines')
          : this.props.headerLines,
      footerLines:
        patch.footerLines !== undefined
          ? sanitizeLines(patch.footerLines, 4, 80, 'footerLines')
          : this.props.footerLines,
      thankYouText,
      returnsPolicyText,
      showSku: patch.showSku ?? this.props.showSku,
      showTax: patch.showTax ?? this.props.showTax,
      paperWidth,
      locale:
        patch.locale !== undefined ? sanitizeLine(patch.locale, 16, 'locale') : this.props.locale,
      currencyCode:
        patch.currencyCode !== undefined
          ? sanitizeLine(patch.currencyCode.toUpperCase(), 3, 'currencyCode')
          : this.props.currencyCode,
      logoMediaId:
        patch.logoMediaId === undefined
          ? this.props.logoMediaId
          : patch.logoMediaId === null
            ? null
            : sanitizeLine(patch.logoMediaId, 64, 'logoMediaId'),
      version: this.props.version + 1,
      updatedAt: new Date(),
      updatedBy: actorUserId,
    };

    this.addEvent('ReceiptTemplateUpdated', {
      templateId: this.id.value,
      storeId: this.storeId,
      version: this.version,
      actorUserId,
    });
  }

  get storeId(): string {
    return this.props.storeId;
  }

  get vendorId(): string {
    return this.props.vendorId;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get addressLines(): readonly string[] {
    return this.props.addressLines;
  }

  get phone(): string | null {
    return this.props.phone;
  }

  get website(): string | null {
    return this.props.website;
  }

  get headerLines(): readonly string[] {
    return this.props.headerLines;
  }

  get footerLines(): readonly string[] {
    return this.props.footerLines;
  }

  get thankYouText(): string {
    return this.props.thankYouText;
  }

  get returnsPolicyText(): string {
    return this.props.returnsPolicyText;
  }

  get showSku(): boolean {
    return this.props.showSku;
  }

  get showTax(): boolean {
    return this.props.showTax;
  }

  get paperWidth(): ReceiptPaperWidth {
    return this.props.paperWidth;
  }

  get locale(): string {
    return this.props.locale;
  }

  get currencyCode(): string {
    return this.props.currencyCode;
  }

  get logoMediaId(): string | null {
    return this.props.logoMediaId;
  }

  get version(): number {
    return this.props.version;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get updatedBy(): string | null {
    return this.props.updatedBy;
  }

  public toProps(): ReceiptTemplateProps {
    return {
      ...this.props,
      addressLines: [...this.props.addressLines],
      headerLines: [...this.props.headerLines],
      footerLines: [...this.props.footerLines],
    };
  }
}

function sanitizeMultiline(raw: string, maxLen: number, field: string): string {
  const cleaned = raw.replace(CONTROL_CHARS, '').replace(/[<>]/g, '').replace(/\r\n/g, '\n').trim();
  if (cleaned.length > maxLen) {
    throw new InvalidReceiptTemplateError(`${field} must be at most ${maxLen} characters.`);
  }
  return cleaned;
}
