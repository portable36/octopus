import { describe, expect, it } from 'vitest';
import { buildCategoryTree } from './category-tree';
import type { CatalogCategory } from './vendor-api';

describe('buildCategoryTree', () => {
  it('returns empty array when given empty list', () => {
    expect(buildCategoryTree([])).toEqual([]);
  });

  it('builds linear list for flat top-level categories sorted by sortOrder', () => {
    const categories: CatalogCategory[] = [
      {
        id: 'cat-2',
        name: 'Fashion',
        slug: 'fashion',
        parentId: null,
        status: 'active',
        sortOrder: 10,
      },
      {
        id: 'cat-1',
        name: 'Electronics',
        slug: 'electronics',
        parentId: null,
        status: 'active',
        sortOrder: 5,
      },
    ];

    const tree = buildCategoryTree(categories);
    expect(tree).toHaveLength(2);
    expect(tree[0]?.id).toBe('cat-1');
    expect(tree[0]?.depth).toBe(0);
    expect(tree[1]?.id).toBe('cat-2');
    expect(tree[1]?.depth).toBe(0);
  });

  it('correctly nests child categories directly under their parents in preorder', () => {
    const categories: CatalogCategory[] = [
      {
        id: 'cat-1',
        name: 'Electronics',
        slug: 'electronics',
        parentId: null,
        status: 'active',
        sortOrder: 1,
      },
      {
        id: 'cat-1-1',
        name: 'Laptops',
        slug: 'laptops',
        parentId: 'cat-1',
        status: 'active',
        sortOrder: 1,
      },
      {
        id: 'cat-1-2',
        name: 'Phones',
        slug: 'phones',
        parentId: 'cat-1',
        status: 'active',
        sortOrder: 2,
      },
      {
        id: 'cat-1-1-1',
        name: 'Gaming Laptops',
        slug: 'gaming-laptops',
        parentId: 'cat-1-1',
        status: 'active',
        sortOrder: 1,
      },
      {
        id: 'cat-2',
        name: 'Clothing',
        slug: 'clothing',
        parentId: null,
        status: 'active',
        sortOrder: 2,
      },
    ];

    const tree = buildCategoryTree(categories);
    expect(tree.map((n) => ({ id: n.id, depth: n.depth }))).toEqual([
      { id: 'cat-1', depth: 0 },
      { id: 'cat-1-1', depth: 1 },
      { id: 'cat-1-1-1', depth: 2 },
      { id: 'cat-1-2', depth: 1 },
      { id: 'cat-2', depth: 0 },
    ]);
  });

  it('treats categories with unknown parentId as root nodes gracefully', () => {
    const categories: CatalogCategory[] = [
      {
        id: 'cat-orphan',
        name: 'Orphan',
        slug: 'orphan',
        parentId: 'non-existent',
        status: 'active',
      },
    ];

    const tree = buildCategoryTree(categories);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.id).toBe('cat-orphan');
    expect(tree[0]?.depth).toBe(0);
  });
});
