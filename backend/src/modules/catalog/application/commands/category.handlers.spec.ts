import { describe, expect, it, vi } from 'vitest';
import {
  CreateCategoryHandler,
  ListCategoriesHandler,
  UpdateCategoryHandler,
} from './category.handlers';
import { Category } from '../../domain/aggregates/category.aggregate';
import {
  CatalogAccessDeniedError,
  CategoryNotFoundError,
  CategorySlugTakenError,
} from '../errors/catalog.errors';
import { CategoryCycleError } from '../../domain/errors/catalog.errors';

describe('CategoryHandlers', () => {
  const createMockRepo = () => ({
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn(),
    findAll: vi.fn(),
    existsSiblingSlug: vi.fn().mockResolvedValue(false),
    findAncestorIds: vi.fn().mockResolvedValue([]),
  });

  describe('CreateCategoryHandler', () => {
    it('creates a top-level category when executed by PLATFORM_ADMIN', async () => {
      const repo = createMockRepo();
      const handler = new CreateCategoryHandler(repo as never);

      const category = await handler.execute({
        actorRoles: ['PLATFORM_ADMIN'],
        name: 'Electronics',
        sortOrder: 1,
        seoTitle: 'Electronics Shop',
        seoDescription: 'Find gadgets',
      });

      expect(category.name).toBe('Electronics');
      expect(category.slug).toBe('electronics');
      expect(category.parentId).toBeNull();
      expect(repo.save).toHaveBeenCalledWith(category);
    });

    it('rejects execution when caller is not PLATFORM_ADMIN', async () => {
      const repo = createMockRepo();
      const handler = new CreateCategoryHandler(repo as never);

      await expect(
        handler.execute({
          actorRoles: ['VENDOR_OWNER'],
          name: 'Electronics',
        }),
      ).rejects.toBeInstanceOf(CatalogAccessDeniedError);
    });

    it('rejects when parent category does not exist', async () => {
      const repo = createMockRepo();
      repo.findById.mockResolvedValue(null);
      const handler = new CreateCategoryHandler(repo as never);

      await expect(
        handler.execute({
          actorRoles: ['PLATFORM_ADMIN'],
          name: 'Smartphones',
          parentId: 'non-existent-parent',
        }),
      ).rejects.toBeInstanceOf(CategoryNotFoundError);
    });

    it('rejects when sibling slug already exists', async () => {
      const repo = createMockRepo();
      repo.existsSiblingSlug.mockResolvedValue(true);
      const handler = new CreateCategoryHandler(repo as never);

      await expect(
        handler.execute({
          actorRoles: ['PLATFORM_ADMIN'],
          name: 'Electronics',
        }),
      ).rejects.toBeInstanceOf(CategorySlugTakenError);
    });
  });

  describe('UpdateCategoryHandler', () => {
    it('updates category fields via patch', async () => {
      const repo = createMockRepo();
      const category = Category.create({ name: 'Old Name' });
      repo.findById.mockResolvedValue(category);
      const handler = new UpdateCategoryHandler(repo as never);

      const updated = await handler.update(category.id.value, ['PLATFORM_ADMIN'], {
        name: 'New Name',
        seoTitle: 'New Title',
      });

      expect(updated.name).toBe('New Name');
      expect(updated.slug).toBe('new-name');
      expect(updated.seo.title).toBe('New Title');
      expect(repo.save).toHaveBeenCalledWith(category);
    });

    it('prevents direct cycle when moving to self', async () => {
      const repo = createMockRepo();
      const category = Category.create({ name: 'Gadgets' });
      repo.findById.mockResolvedValue(category);
      const handler = new UpdateCategoryHandler(repo as never);

      await expect(
        handler.move(category.id.value, ['PLATFORM_ADMIN'], category.id.value),
      ).rejects.toBeInstanceOf(CategoryCycleError);
    });

    it('prevents indirect cycle when moving to descendant', async () => {
      const repo = createMockRepo();
      const root = Category.create({ name: 'Root Category' });
      const child = Category.create({ name: 'Child Category', parentId: root.id.value });
      repo.findById.mockResolvedValue(root);
      // If moving root under child, child's ancestors list contains root.id.value
      repo.findAncestorIds.mockResolvedValue([root.id.value]);
      const handler = new UpdateCategoryHandler(repo as never);

      await expect(
        handler.move(root.id.value, ['PLATFORM_ADMIN'], child.id.value),
      ).rejects.toBeInstanceOf(CategoryCycleError);
    });

    it('archives an active category', async () => {
      const repo = createMockRepo();
      const category = Category.create({ name: 'To Archive' });
      repo.findById.mockResolvedValue(category);
      const handler = new UpdateCategoryHandler(repo as never);

      const archived = await handler.archive(category.id.value, ['PLATFORM_ADMIN']);
      expect(archived.status).toBe('archived');
      expect(repo.save).toHaveBeenCalledWith(category);
    });
  });

  describe('ListCategoriesHandler', () => {
    it('returns all categories and finds by id', async () => {
      const repo = createMockRepo();
      const cat1 = Category.create({ name: 'Cat 1' });
      const cat2 = Category.create({ name: 'Cat 2' });
      repo.findAll.mockResolvedValue([cat1, cat2]);
      repo.findById.mockResolvedValue(cat1);

      const handler = new ListCategoriesHandler(repo as never);

      const all = await handler.execute();
      expect(all).toHaveLength(2);

      const single = await handler.byId(cat1.id.value);
      expect(single?.name).toBe('Cat 1');
    });
  });
});
