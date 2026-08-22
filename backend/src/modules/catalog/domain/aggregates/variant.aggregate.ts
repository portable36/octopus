import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { Money } from '../../../../shared-kernel/domain/money.value-object';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  BarcodeIdentifier,
  type BarcodeIdentifierType,
} from '../value-objects/barcode-identifier.value-object';
import { Dimensions, type DimensionsInput } from '../value-objects/dimensions.value-object';
import { Sku } from '../value-objects/sku.value-object';
import { Weight } from '../value-objects/weight.value-object';

export type VariantStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'DISCONTINUED';

export interface VariantAttributeAssignment {
  readonly code: string;
  readonly value: string | number | boolean | readonly string[];
}

export interface VariantMediaReference {
  readonly mediaId: string;
  readonly mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | '360_VIEW';
  readonly isPrimary: boolean;
}

export interface VariantExternalReference {
  readonly system: string;
  readonly externalId: string;
}

export interface VariantCreateInput {
  readonly name: string;
  readonly sku: string;
  readonly barcode?: string;
  readonly gtin?: string;
  readonly ean?: string;
  readonly upc?: string;
  readonly mpn?: string;
  readonly manufacturerReference?: string;
  readonly costPrice?: Money;
  readonly basePrice?: Money;
  readonly compareAtPrice?: Money;
  readonly weight?: Weight;
  readonly dimensions?: DimensionsInput;
  readonly attributes?: readonly VariantAttributeAssignment[];
  readonly media?: readonly VariantMediaReference[];
  readonly taxClassificationReference?: string;
  readonly shippingClassificationReference?: string;
  readonly externalReferences?: readonly VariantExternalReference[];
}

interface VariantProps {
  readonly productId: UniqueID;
  readonly sku: Sku;
  readonly name: string;
  readonly identifiers: ReadonlyMap<BarcodeIdentifierType, BarcodeIdentifier>;
  readonly mpn: string | undefined;
  readonly manufacturerReference: string | undefined;
  readonly costPrice: Money | undefined;
  readonly basePrice: Money | undefined;
  readonly compareAtPrice: Money | undefined;
  readonly weight: Weight | undefined;
  readonly dimensions: Dimensions | undefined;
  readonly status: VariantStatus;
  readonly attributes: readonly VariantAttributeAssignment[];
  readonly media: readonly VariantMediaReference[];
  readonly taxClassificationReference: string | undefined;
  readonly shippingClassificationReference: string | undefined;
  readonly externalReferences: readonly VariantExternalReference[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 200;

export class Variant extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: VariantProps,
  ) {
    super(id);
  }

  public static create(productId: UniqueID, input: VariantCreateInput): Variant {
    const name = input.name.trim();
    if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
      throw new Error('Variant name must contain between 1 and 200 characters.');
    }
    Variant.assertCurrencyConsistency(input.costPrice, input.basePrice, input.compareAtPrice);

    const now = new Date();
    const variant = new Variant(UniqueID.create(), {
      productId,
      sku: Sku.create(input.sku),
      name,
      identifiers: Variant.createIdentifiers(input),
      mpn: Variant.normalizeOptional(input.mpn),
      manufacturerReference: Variant.normalizeOptional(input.manufacturerReference),
      costPrice: input.costPrice,
      basePrice: input.basePrice,
      compareAtPrice: input.compareAtPrice,
      weight: input.weight,
      dimensions: input.dimensions ? Dimensions.create(input.dimensions) : undefined,
      status: 'DRAFT',
      attributes: [...(input.attributes ?? [])],
      media: [...(input.media ?? [])],
      taxClassificationReference: Variant.normalizeOptional(input.taxClassificationReference),
      shippingClassificationReference: Variant.normalizeOptional(
        input.shippingClassificationReference,
      ),
      externalReferences: [...(input.externalReferences ?? [])],
      createdAt: now,
      updatedAt: now,
    });

    variant.addEvent('ProductVariantCreated', {
      productId: productId.value,
      variantId: variant.id.value,
      sku: variant.sku,
    });
    return variant;
  }

  public get productId(): string {
    return this.props.productId.value;
  }

  public get sku(): string {
    return this.props.sku.getRawValue();
  }

  public get name(): string {
    return this.props.name;
  }

  public get status(): VariantStatus {
    return this.props.status;
  }

  public get barcode(): string | undefined {
    return this.props.identifiers.get('BARCODE')?.value;
  }

  public get gtin(): string | undefined {
    return this.props.identifiers.get('GTIN')?.value;
  }

  public get ean(): string | undefined {
    return this.props.identifiers.get('EAN')?.value;
  }

  public get upc(): string | undefined {
    return this.props.identifiers.get('UPC')?.value;
  }

  public get mpn(): string | undefined {
    return this.props.mpn;
  }

  public get manufacturerReference(): string | undefined {
    return this.props.manufacturerReference;
  }

  public get costPrice(): Money | undefined {
    return this.props.costPrice;
  }

  public get basePrice(): Money | undefined {
    return this.props.basePrice;
  }

  public get compareAtPrice(): Money | undefined {
    return this.props.compareAtPrice;
  }

  public get currency(): string | undefined {
    return (
      this.props.basePrice?.currency ??
      this.props.compareAtPrice?.currency ??
      this.props.costPrice?.currency
    );
  }

  public get weight(): Weight | undefined {
    return this.props.weight;
  }

  public get dimensions(): Dimensions | undefined {
    return this.props.dimensions;
  }

  public get attributes(): ReadonlyArray<VariantAttributeAssignment> {
    return [...this.props.attributes];
  }

  public get media(): ReadonlyArray<VariantMediaReference> {
    return [...this.props.media];
  }

  public get externalReferences(): ReadonlyArray<VariantExternalReference> {
    return [...this.props.externalReferences];
  }

  public get taxClassificationReference(): string | undefined {
    return this.props.taxClassificationReference;
  }

  public get shippingClassificationReference(): string | undefined {
    return this.props.shippingClassificationReference;
  }

  public get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  public get updatedAt(): Date {
    return new Date(this.props.updatedAt);
  }

  public changeSku(rawSku: string): void {
    if (this.props.externalReferences.length > 0) {
      throw new Error('SKU cannot change after external references exist.');
    }
    const sku = Sku.create(rawSku);
    if (sku.getRawValue() === this.sku) return;
    const previousSku = this.sku;
    this.props = { ...this.props, sku, updatedAt: new Date() };
    this.addEvent('ProductVariantSkuChanged', {
      variantId: this.id.value,
      previousSku,
      sku: this.sku,
    });
  }

  public activate(): void {
    this.transitionTo('ACTIVE');
  }

  public archive(): void {
    this.transitionTo('ARCHIVED');
  }

  public discontinue(): void {
    this.transitionTo('DISCONTINUED');
  }

  private transitionTo(status: VariantStatus): void {
    if (this.props.status === status) {
      throw new Error(`Variant is already ${status}.`);
    }
    if (this.props.status === 'ARCHIVED' || this.props.status === 'DISCONTINUED') {
      throw new Error(`Variant cannot transition from ${this.props.status}.`);
    }
    const previousStatus = this.props.status;
    this.props = { ...this.props, status, updatedAt: new Date() };
    this.addEvent('ProductVariantStatusChanged', {
      variantId: this.id.value,
      fromStatus: previousStatus,
      toStatus: status,
    });
  }

  private static createIdentifiers(
    input: VariantCreateInput,
  ): ReadonlyMap<BarcodeIdentifierType, BarcodeIdentifier> {
    const entries: Array<[BarcodeIdentifierType, BarcodeIdentifier]> = [];
    const values: Array<[BarcodeIdentifierType, string | undefined]> = [
      ['BARCODE', input.barcode],
      ['GTIN', input.gtin],
      ['EAN', input.ean],
      ['UPC', input.upc],
    ];
    for (const [type, value] of values) {
      if (value !== undefined) entries.push([type, BarcodeIdentifier.create(type, value)]);
    }
    return new Map(entries);
  }

  private static normalizeOptional(value: string | undefined): string | undefined {
    const normalized = value?.trim();
    return normalized || undefined;
  }

  private static assertCurrencyConsistency(...prices: Array<Money | undefined>): void {
    const currencies = new Set(
      prices.filter((price): price is Money => price !== undefined).map((price) => price.currency),
    );
    if (currencies.size > 1) {
      throw new Error('Variant price metadata must use one currency.');
    }
  }
}
