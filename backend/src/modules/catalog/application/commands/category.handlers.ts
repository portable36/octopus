import { Inject, Injectable } from '@nestjs/common';
import { Category } from '../../domain/aggregates/category.aggregate';
import type { CategorySeo } from '../../domain/catalog.types';
import {
  CatalogAccessDeniedError,
  CategoryNotFoundError,
  CategorySlugTakenError,
} from '../errors/catalog.errors';
import {
  CATEGORY_REPOSITORY,
  type CategoryRepository,
} from '../ports/category-repository.interface';

function isPlatformAdmin(roles: readonly string[]): boolean {
  return roles.includes('PLATFORM_ADMIN');
}

@Injectable()
export class CreateCategoryHandler {
  constructor(@Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository) {}

  public async execute(input: {
    readonly actorRoles: readonly string[];
    readonly name: string;
    readonly parentId?: string | null;
    readonly sortOrder?: number;
    readonly seoTitle?: string | null;
    readonly seoDescription?: string | null;
  }): Promise<Category> {
    if (!isPlatformAdmin(input.actorRoles)) {
      throw new CatalogAccessDeniedError();
    }
    if (input.parentId) {
      const parent = await this.categories.findById(input.parentId);
      if (!parent) {
        throw new CategoryNotFoundError();
      }
    }
    const category = Category.create({
      name: input.name,
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.seoTitle !== undefined ? { seoTitle: input.seoTitle } : {}),
      ...(input.seoDescription !== undefined ? { seoDescription: input.seoDescription } : {}),
    });
    if (await this.categories.existsSiblingSlug(category.parentId, category.slug)) {
      throw new CategorySlugTakenError();
    }
    await this.categories.save(category);
    return category;
  }
}

@Injectable()
export class UpdateCategoryHandler {
  constructor(@Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository) {}

  public async rename(
    categoryId: string,
    actorRoles: readonly string[],
    name: string,
  ): Promise<Category> {
    if (!isPlatformAdmin(actorRoles)) {
      throw new CatalogAccessDeniedError();
    }
    const category = await this.require(categoryId);
    category.rename(name);
    await this.categories.save(category);
    return category;
  }

  public async move(
    categoryId: string,
    actorRoles: readonly string[],
    parentId: string | null,
  ): Promise<Category> {
    if (!isPlatformAdmin(actorRoles)) {
      throw new CatalogAccessDeniedError();
    }
    const category = await this.require(categoryId);
    const ancestors = parentId ? await this.categories.findAncestorIds(parentId) : [];
    if (parentId) {
      ancestors.push(parentId);
    }
    category.moveTo(parentId, ancestors);
    await this.categories.save(category);
    return category;
  }

  public async updateSeo(
    categoryId: string,
    actorRoles: readonly string[],
    seo: CategorySeo,
  ): Promise<Category> {
    if (!isPlatformAdmin(actorRoles)) {
      throw new CatalogAccessDeniedError();
    }
    const category = await this.require(categoryId);
    category.updateSeo(seo);
    await this.categories.save(category);
    return category;
  }

  public async archive(categoryId: string, actorRoles: readonly string[]): Promise<Category> {
    if (!isPlatformAdmin(actorRoles)) {
      throw new CatalogAccessDeniedError();
    }
    const category = await this.require(categoryId);
    category.archive();
    await this.categories.save(category);
    return category;
  }

  private async require(categoryId: string): Promise<Category> {
    const category = await this.categories.findById(categoryId);
    if (!category) {
      throw new CategoryNotFoundError();
    }
    return category;
  }
}

@Injectable()
export class ListCategoriesHandler {
  constructor(@Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository) {}

  public async execute(): Promise<Category[]> {
    return this.categories.findAll();
  }
}
