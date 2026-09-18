'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { fieldClass } from '@/components/ui/field';
import { ApiClientError } from '@/lib/api-client';
import {
  createAdminContentPage,
  listAdminContentPages,
  type AdminContentPageListItem,
} from '@/lib/admin-content-api';

export default function AdminContentPagesListPage() {
  const [items, setItems] = useState<AdminContentPageListItem[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listAdminContentPages({
        q: q.trim() || null,
        status: status || null,
        includeArchived,
        limit: 50,
      });
      setItems(result.items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load pages.');
    } finally {
      setLoading(false);
    }
  }, [includeArchived, q, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const page = await createAdminContentPage({
        title: title.trim(),
        slug: slug.trim(),
        body: [],
      });
      window.location.href = `/admin/system/content/pages/${page.id}`;
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to create page.');
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Content pages"
        description="Draft and publish platform CMS pages (structured blocks, no visual builder)."
      />

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={onCreate}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
      >
        <label className="grid gap-1 text-sm">
          <span>Title</span>
          <input
            className={fieldClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Slug</span>
          <input
            className={fieldClass}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            required
          />
        </label>
        <Button type="submit" disabled={creating}>
          {creating ? 'Creating…' : 'Create page'}
        </Button>
      </form>

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          <span>Search</span>
          <input
            className={fieldClass}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Title or slug"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Status</span>
          <select className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="UNPUBLISHED">Unpublished</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Include archived
        </label>
        <Button type="button" variant="outline" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      {!loading && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No content pages yet.</p>
      ) : null}

      {items.length > 0 ? (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Title</th>
              <th className="py-2 pr-3 font-medium">Slug</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border/60">
                <td className="py-2 pr-3">
                  <Link
                    href={`/admin/system/content/pages/${item.id}`}
                    className="font-medium text-foreground underline-offset-2 hover:underline"
                  >
                    {item.title}
                  </Link>
                </td>
                <td className="py-2 pr-3 font-mono text-xs">{item.slug}</td>
                <td className="py-2 pr-3">{item.status}</td>
                <td className="py-2 pr-3 text-muted-foreground">
                  {new Date(item.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
