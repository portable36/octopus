import type { CatalogCategory } from './vendor-api';

export type CategoryNode = CatalogCategory & {
  children: CategoryNode[];
  depth: number;
};

/**
 * Builds a flattened, preorder-traversed hierarchy tree of categories,
 * ordering children and roots by sortOrder ascending.
 */
export function buildCategoryTree(categories: readonly CatalogCategory[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const cat of categories) {
    byId.set(cat.id, { ...cat, children: [], depth: 0 });
  }

  const roots: CategoryNode[] = [];
  for (const cat of categories) {
    const node = byId.get(cat.id)!;
    if (cat.parentId && byId.has(cat.parentId)) {
      const parent = byId.get(cat.parentId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      node.depth = 0;
      roots.push(node);
    }
  }

  const flattened: CategoryNode[] = [];
  function traverse(node: CategoryNode) {
    flattened.push(node);
    node.children.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    for (const child of node.children) {
      child.depth = node.depth + 1;
      traverse(child);
    }
  }

  roots.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  for (const root of roots) {
    traverse(root);
  }

  return flattened;
}
