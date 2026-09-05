'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  adminArchiveCategory,
  adminCreateCategory,
  adminUpdateCategory,
  listCatalogCategories,
  type CatalogCategory,
} from '@/lib/vendor-api';
import { buildCategoryTree } from '@/lib/category-tree';
import { useAccessToken } from '@/lib/use-access-token';

export default function AdminCategoriesPage() {
  const token = useAccessToken();

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Create form state
  const [isCreating, setIsCreating] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createParentId, setCreateParentId] = useState<string>('');
  const [createSortOrder, setCreateSortOrder] = useState<number>(0);
  const [createSeoTitle, setCreateSeoTitle] = useState('');
  const [createSeoDescription, setCreateSeoDescription] = useState('');

  // Edit form state
  const [editingCategory, setEditingCategory] = useState<CatalogCategory | null>(null);
  const [editPending, setEditPending] = useState(false);
  const [editName, setEditName] = useState('');
  const [editParentId, setEditParentId] = useState<string>('');
  const [editSortOrder, setEditSortOrder] = useState<number>(0);
  const [editSeoTitle, setEditSeoTitle] = useState('');
  const [editSeoDescription, setEditSeoDescription] = useState('');

  const reloadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listCatalogCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      void reloadCategories();
    }
  }, [token, reloadCategories]);

  // Build tree hierarchy
  const treeNodes = useMemo(() => {
    return buildCategoryTree(categories);
  }, [categories]);

  const filteredCategories = useMemo(() => {
    return treeNodes.filter((item) => {
      if (statusFilter !== 'all' && item.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (filterQuery.trim()) {
        const q = filterQuery.toLowerCase().trim();
        return item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q);
      }
      return true;
    });
  }, [treeNodes, filterQuery, statusFilter]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!createName.trim()) return;

    setCreatePending(true);
    setError(null);
    try {
      await adminCreateCategory({
        name: createName.trim(),
        parentId: createParentId ? createParentId : null,
        sortOrder: createSortOrder,
        seoTitle: createSeoTitle.trim() || null,
        seoDescription: createSeoDescription.trim() || null,
      });
      setIsCreating(false);
      setCreateName('');
      setCreateParentId('');
      setCreateSortOrder(0);
      setCreateSeoTitle('');
      setCreateSeoDescription('');
      await reloadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category.');
    } finally {
      setCreatePending(false);
    }
  }

  function startEdit(cat: CatalogCategory) {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditParentId(cat.parentId ?? '');
    setEditSortOrder(cat.sortOrder ?? 0);
    setEditSeoTitle(cat.seo?.title ?? '');
    setEditSeoDescription(cat.seo?.description ?? '');
  }

  async function handleUpdate(event: FormEvent) {
    event.preventDefault();
    if (!editingCategory || !editName.trim()) return;

    setEditPending(true);
    setError(null);
    try {
      await adminUpdateCategory(editingCategory.id, {
        name: editName.trim(),
        parentId: editParentId ? editParentId : null,
        sortOrder: editSortOrder,
        seoTitle: editSeoTitle.trim() || null,
        seoDescription: editSeoDescription.trim() || null,
      });
      setEditingCategory(null);
      await reloadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category.');
    } finally {
      setEditPending(false);
    }
  }

  async function handleArchive(category: CatalogCategory) {
    if (!confirm(`Are you sure you want to archive category "${category.name}"?`)) {
      return;
    }
    setError(null);
    try {
      await adminArchiveCategory(category.id);
      await reloadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive category.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <AdminPageHeader
          title="Category Hierarchy"
          description="Manage product categories, hierarchy trees, and storefront SEO metadata."
        />
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          + Create category
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Create form drawer */}
      {isCreating && (
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">Create New Category</h3>
            <Button variant="outline" size="sm" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Category Name *
                <input
                  type="text"
                  required
                  minLength={2}
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Smart Electronics"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                />
              </label>
              <label className="block text-sm font-medium">
                Parent Category
                <select
                  value={createParentId}
                  onChange={(e) => setCreateParentId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                >
                  <option value="">None (Top-Level Category)</option>
                  {categories
                    .filter((c) => c.status !== 'archived')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.slug})
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block text-sm font-medium">
                Sort Order
                <input
                  type="number"
                  value={createSortOrder}
                  onChange={(e) => setCreateSortOrder(Number.parseInt(e.target.value, 10) || 0)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                />
              </label>
              <label className="block text-sm font-medium">
                SEO Title (optional)
                <input
                  type="text"
                  value={createSeoTitle}
                  onChange={(e) => setCreateSeoTitle(e.target.value)}
                  placeholder="Meta title"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                />
              </label>
              <label className="block text-sm font-medium">
                SEO Description (optional)
                <input
                  type="text"
                  value={createSeoDescription}
                  onChange={(e) => setCreateSeoDescription(e.target.value)}
                  placeholder="Meta description"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreating(false)}
                disabled={createPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createPending}>
                {createPending ? 'Creating…' : 'Save Category'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Edit modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">Edit Category: {editingCategory.name}</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditingCategory(null)}>
                ✕
              </Button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <label className="block text-sm font-medium">
                Category Name *
                <input
                  type="text"
                  required
                  minLength={2}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                />
              </label>

              <label className="block text-sm font-medium">
                Parent Category
                <select
                  value={editParentId}
                  onChange={(e) => setEditParentId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                >
                  <option value="">None (Top-Level Category)</option>
                  {categories
                    .filter((c) => c.id !== editingCategory.id && c.status !== 'archived')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.slug})
                      </option>
                    ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium">
                  Sort Order
                  <input
                    type="number"
                    value={editSortOrder}
                    onChange={(e) => setEditSortOrder(Number.parseInt(e.target.value, 10) || 0)}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  />
                </label>
                <label className="block text-sm font-medium">
                  SEO Title
                  <input
                    type="text"
                    value={editSeoTitle}
                    onChange={(e) => setEditSeoTitle(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium">
                SEO Description
                <textarea
                  rows={2}
                  value={editSeoDescription}
                  onChange={(e) => setEditSeoDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingCategory(null)}
                  disabled={editPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editPending}>
                  {editPending ? 'Updating…' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search by name or slug…"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm sm:w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="archived">Archived only</option>
        </select>
        <span className="text-xs text-muted-foreground">
          Showing {filteredCategories.length} of {categories.length} categories
        </span>
      </div>

      {/* Categories table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading categories…</div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No categories found matching your filter criteria.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Category Name / Hierarchy</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCategories.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">
                    <span
                      style={{ paddingLeft: `${item.depth * 20}px` }}
                      className="inline-flex items-center gap-2"
                    >
                      {item.depth > 0 && <span className="text-muted-foreground">↳</span>}
                      <span>{item.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.slug}</td>
                  <td className="px-4 py-3 text-xs">{item.sortOrder ?? 0}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(item)}
                        disabled={item.status === 'archived'}
                      >
                        Edit
                      </Button>
                      {item.status !== 'archived' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleArchive(item)}
                        >
                          Archive
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
