import type { Category } from '../../domain/aggregates/category.aggregate';

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export interface CategoryRepository {
  save(category: Category): Promise<void>;
  findById(id: string): Promise<Category | null>;
  findAll(): Promise<Category[]>;
  existsSiblingSlug(parentId: string | null, slug: string, excludeId?: string): Promise<boolean>;
  findAncestorIds(categoryId: string): Promise<string[]>;
}
