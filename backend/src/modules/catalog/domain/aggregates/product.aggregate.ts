import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { CatalogDomainError, InvalidProductStatusTransitionError } from '../errors/catalog.errors';
import type {
  CatalogAttributeAssignment,
  CatalogMediaReference,
  ProductStatus,
} from '../catalog.types';
import { Sku } from '../value-objects/sku.value-object';

interface ProductProps {
  vendorId: string;
  sku: Sku;
  name: string;
  description: string | null;
  brandId: string | null;
  categoryIds: readonly string[];
  status: ProductStatus;
  attributes: readonly CatalogAttributeAssignment[];
  media: readonly CatalogMediaReference[];
  variantIds: readonly string[];
}

const MIN_NAME_LENGTH = 3;
const ALLOWED_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  draft: ['pending_review', 'archived'],
  pending_review: ['published', 'draft', 'archived'],
  published: ['unpublished', 'archived'],
  unpublished: ['published', 'archived'],
  archived: [],
};

export class Product extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: ProductProps,
  ) {
    super(id);
  }

  public static create(input: {
    readonly vendorId: string;
    readonly sku: string;
    readonly name: string;
    readonly description?: string | null;
    readonly brandId?: string | null;
    readonly categoryIds?: readonly string[];
  }): Product {
    const name = input.name.trim();
    if (name.length < MIN_NAME_LENGTH) {
      throw new CatalogDomainError('Product name must contain at least 3 characters.');
    }

    const product = new Product(UniqueID.create(), {
      vendorId: input.vendorId,
      sku: Sku.create(input.sku),
      name,
      description: input.description?.trim() || null,
      brandId: input.brandId ?? null,
      categoryIds: [...(input.categoryIds ?? [])],
      status: 'draft',
      attributes: [],
      media: [],
      variantIds: [],
    });

    product.addEvent('ProductCreated', {
      productId: product.id.value,
      vendorId: input.vendorId,
      sku: product.sku,
    });
    return product;
  }

  public static rehydrate(input: {
    readonly id: string;
    readonly vendorId: string;
    readonly sku: string;
    readonly name: string;
    readonly description: string | null;
    readonly brandId: string | null;
    readonly categoryIds: readonly string[];
    readonly status: ProductStatus;
    readonly attributes: readonly CatalogAttributeAssignment[];
    readonly media: readonly CatalogMediaReference[];
    readonly variantIds: readonly string[];
  }): Product {
    return new Product(UniqueID.from(input.id), {
      vendorId: input.vendorId,
      sku: Sku.create(input.sku),
      name: input.name,
      description: input.description,
      brandId: input.brandId,
      categoryIds: input.categoryIds,
      status: input.status,
      attributes: input.attributes,
      media: input.media,
      variantIds: input.variantIds,
    });
  }

  get vendorId(): string {
    return this.props.vendorId;
  }

  get sku(): string {
    return this.props.sku.getRawValue();
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get brandId(): string | null {
    return this.props.brandId;
  }

  get categoryIds(): readonly string[] {
    return this.props.categoryIds;
  }

  get status(): ProductStatus {
    return this.props.status;
  }

  get attributes(): readonly CatalogAttributeAssignment[] {
    return this.props.attributes;
  }

  get media(): readonly CatalogMediaReference[] {
    return this.props.media;
  }

  get variantIds(): readonly string[] {
    return this.props.variantIds;
  }

  /** @deprecated Prefer status === 'published'; kept for early scaffold compatibility. */
  get isAvailable(): boolean {
    return this.props.status === 'published';
  }

  public rename(name: string): void {
    this.assertMutable();
    const trimmed = name.trim();
    if (trimmed.length < MIN_NAME_LENGTH) {
      throw new CatalogDomainError('Product name must contain at least 3 characters.');
    }
    this.props = { ...this.props, name: trimmed };
    this.addEvent('ProductRenamed', { productId: this.id.value, name: trimmed });
  }

  public updateDescription(description: string | null): void {
    this.assertMutable();
    this.props = { ...this.props, description: description?.trim() || null };
    this.addEvent('ProductDescriptionUpdated', { productId: this.id.value });
  }

  public assignBrand(brandId: string | null): void {
    this.assertMutable();
    this.props = { ...this.props, brandId };
    this.addEvent('ProductBrandAssigned', { productId: this.id.value, brandId });
  }

  public setCategories(categoryIds: readonly string[]): void {
    this.assertMutable();
    this.props = { ...this.props, categoryIds: [...categoryIds] };
    this.addEvent('ProductCategoriesUpdated', { productId: this.id.value });
  }

  public setAttributes(attributes: readonly CatalogAttributeAssignment[]): void {
    this.assertMutable();
    this.props = { ...this.props, attributes: [...attributes] };
    this.addEvent('ProductAttributesUpdated', { productId: this.id.value });
  }

  public setMedia(media: readonly CatalogMediaReference[]): void {
    this.assertMutable();
    const primaries = media.filter((item) => item.isPrimary);
    if (primaries.length > 1) {
      throw new CatalogDomainError('A product may have at most one primary media item.');
    }
    this.props = { ...this.props, media: [...media] };
    this.addEvent('ProductMediaUpdated', { productId: this.id.value });
  }

  public attachVariant(variantId: string): void {
    this.assertMutable();
    if (this.props.variantIds.includes(variantId)) {
      return;
    }
    this.props = { ...this.props, variantIds: [...this.props.variantIds, variantId] };
    this.addEvent('ProductVariantAttached', { productId: this.id.value, variantId });
  }

  public submitForReview(): void {
    this.transitionTo('pending_review');
  }

  public publish(): void {
    this.transitionTo('published');
  }

  public unpublish(): void {
    this.transitionTo('unpublished');
  }

  public archive(): void {
    this.transitionTo('archived');
  }

  /** @deprecated Prefer unpublish/archive. */
  public markUnavailable(): void {
    if (this.props.status === 'published') {
      this.unpublish();
      return;
    }
    this.addEvent('ProductMarkedUnavailable', { productId: this.id.value });
  }

  private transitionTo(target: ProductStatus): void {
    const allowed = ALLOWED_TRANSITIONS[this.props.status];
    if (!allowed.includes(target)) {
      throw new InvalidProductStatusTransitionError(this.props.status, target);
    }
    const from = this.props.status;
    this.props = { ...this.props, status: target };
    this.addEvent('ProductStatusChanged', {
      productId: this.id.value,
      fromStatus: from,
      toStatus: target,
    });
  }

  private assertMutable(): void {
    if (this.props.status === 'archived') {
      throw new CatalogDomainError('Archived products cannot be mutated.');
    }
  }
}
