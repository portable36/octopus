import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { CatalogDomainError, CategoryCycleError } from '../errors/catalog.errors';
import type { CategorySeo, CategoryStatus } from '../catalog.types';

interface CategoryProps {
  name: string;
  slug: string;
  parentId: string | null;
  status: CategoryStatus;
  sortOrder: number;
  seo: CategorySeo;
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export class Category extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: CategoryProps,
  ) {
    super(id);
  }

  public static create(input: {
    readonly name: string;
    readonly parentId?: string | null;
    readonly sortOrder?: number;
    readonly seoTitle?: string | null;
    readonly seoDescription?: string | null;
  }): Category {
    const name = input.name.trim();
    if (name.length < 2) {
      throw new CatalogDomainError('Category name must contain at least 2 characters.');
    }
    const slug = slugify(name);
    if (slug.length < 2) {
      throw new CatalogDomainError('Unable to derive a valid category slug.');
    }

    const category = new Category(UniqueID.create(), {
      name,
      slug,
      parentId: input.parentId ?? null,
      status: 'active',
      sortOrder: input.sortOrder ?? 0,
      seo: {
        title: input.seoTitle?.trim() || null,
        description: input.seoDescription?.trim() || null,
      },
    });

    category.addEvent('CategoryCreated', {
      categoryId: category.id.value,
      slug: category.props.slug,
      parentId: category.props.parentId,
    });
    return category;
  }

  public static rehydrate(input: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly parentId: string | null;
    readonly status: CategoryStatus;
    readonly sortOrder: number;
    readonly seo: CategorySeo;
  }): Category {
    return new Category(UniqueID.from(input.id), {
      name: input.name,
      slug: input.slug,
      parentId: input.parentId,
      status: input.status,
      sortOrder: input.sortOrder,
      seo: input.seo,
    });
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get parentId(): string | null {
    return this.props.parentId;
  }

  get status(): CategoryStatus {
    return this.props.status;
  }

  get sortOrder(): number {
    return this.props.sortOrder;
  }

  get seo(): CategorySeo {
    return this.props.seo;
  }

  public rename(name: string): void {
    this.assertActive();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      throw new CatalogDomainError('Category name must contain at least 2 characters.');
    }
    this.props = {
      ...this.props,
      name: trimmed,
      slug: slugify(trimmed),
    };
    this.addEvent('CategoryRenamed', { categoryId: this.id.value, slug: this.props.slug });
  }

  public moveTo(parentId: string | null, newParentAncestorIds: readonly string[]): void {
    this.assertActive();
    if (parentId === this.id.value) {
      throw new CategoryCycleError();
    }
    // If this category is an ancestor of the new parent, moving would create a cycle.
    if (parentId && newParentAncestorIds.includes(this.id.value)) {
      throw new CategoryCycleError();
    }
    this.props = { ...this.props, parentId };
    this.addEvent('CategoryMoved', { categoryId: this.id.value, parentId });
  }

  public updateSeo(seo: CategorySeo): void {
    this.assertActive();
    this.props = { ...this.props, seo };
    this.addEvent('CategorySeoUpdated', { categoryId: this.id.value });
  }

  public archive(): void {
    if (this.props.status === 'archived') {
      throw new CatalogDomainError('Category is already archived.');
    }
    this.props = { ...this.props, status: 'archived' };
    this.addEvent('CategoryArchived', { categoryId: this.id.value });
  }

  private assertActive(): void {
    if (this.props.status === 'archived') {
      throw new CatalogDomainError('Archived categories cannot be mutated.');
    }
  }
}
