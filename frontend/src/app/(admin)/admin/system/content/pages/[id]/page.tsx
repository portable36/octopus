'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { fieldClass } from '@/components/ui/field';
import { ApiClientError } from '@/lib/api-client';
import {
  archiveAdminContentPage,
  getAdminContentPage,
  publishAdminContentPage,
  unpublishAdminContentPage,
  updateAdminContentPage,
  type AdminContentPage,
  type ContentBlock,
} from '@/lib/admin-content-api';

function emptyParagraph(): ContentBlock {
  return { type: 'paragraph', text: '' };
}

export default function AdminContentPageEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [page, setPage] = useState<AdminContentPage | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [body, setBody] = useState<ContentBlock[]>([emptyParagraph()]);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const loaded = await getAdminContentPage(id);
      setPage(loaded);
      setTitle(loaded.title);
      setSlug(loaded.slug);
      setBody(loaded.draftBody.length > 0 ? [...loaded.draftBody] : [emptyParagraph()]);
      setMetaTitle(loaded.draftSeo.metaTitle ?? '');
      setMetaDescription(loaded.draftSeo.metaDescription ?? '');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load page.');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!page) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateAdminContentPage(page.id, {
        expectedVersion: page.version,
        title,
        slug,
        body,
        seo: {
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
        },
      });
      setPage(updated);
      setNotice('Draft saved.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to save draft.');
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: 'publish' | 'unpublish' | 'archive'): Promise<void> {
    if (!page) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const next =
        action === 'publish'
          ? await publishAdminContentPage(page.id, page.version)
          : action === 'unpublish'
            ? await unpublishAdminContentPage(page.id, page.version)
            : await archiveAdminContentPage(page.id, page.version);
      setPage(next);
      setTitle(next.title);
      setSlug(next.slug);
      setBody(next.draftBody.length > 0 ? [...next.draftBody] : [emptyParagraph()]);
      setMetaTitle(next.draftSeo.metaTitle ?? '');
      setMetaDescription(next.draftSeo.metaDescription ?? '');
      setNotice(
        action === 'publish' ? 'Published.' : action === 'unpublish' ? 'Unpublished.' : 'Archived.',
      );
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : `Failed to ${action}.`);
    } finally {
      setBusy(false);
    }
  }

  function updateBlock(
    index: number,
    patch: Partial<ContentBlock> & { type?: ContentBlock['type'] },
  ) {
    setBody((prev) =>
      prev.map((block, i) => {
        if (i !== index) return block;
        if (patch.type && patch.type !== block.type) {
          if (patch.type === 'heading') return { type: 'heading', level: 2, text: '' };
          if (patch.type === 'markdown') return { type: 'markdown', markdown: '' };
          if (patch.type === 'image') return { type: 'image', mediaId: '', alt: '' };
          return { type: 'paragraph', text: '' };
        }
        return { ...block, ...patch } as ContentBlock;
      }),
    );
  }

  if (!page && !error) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={page?.title ?? 'Content page'}
        description={
          page
            ? `Status ${page.status} · version ${page.version} · public /pages/${page.slug}`
            : 'Editor'
        }
      />
      <p className="text-sm">
        <Link href="/admin/system/content/pages" className="underline-offset-2 hover:underline">
          ← All pages
        </Link>
      </p>

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">{notice}</p>
      ) : null}

      {page ? (
        <form onSubmit={onSave} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
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
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>SEO title</span>
              <input
                className={fieldClass}
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>SEO description</span>
              <input
                className={fieldClass}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium">Draft blocks</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBody((prev) => [...prev, emptyParagraph()])}
              >
                Add paragraph
              </Button>
            </div>
            {body.map((block, index) => (
              <div key={index} className="space-y-2 rounded-md border border-border p-3">
                <div className="flex flex-wrap gap-2">
                  <select
                    className={fieldClass}
                    value={block.type}
                    onChange={(e) =>
                      updateBlock(index, { type: e.target.value as ContentBlock['type'] })
                    }
                  >
                    <option value="paragraph">Paragraph</option>
                    <option value="heading">Heading</option>
                    <option value="markdown">Markdown</option>
                    <option value="image">Image</option>
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBody((prev) => prev.filter((_, i) => i !== index))}
                  >
                    Remove
                  </Button>
                </div>
                {block.type === 'heading' ? (
                  <>
                    <select
                      className={fieldClass}
                      value={block.level}
                      onChange={(e) =>
                        updateBlock(index, { level: Number(e.target.value) as 1 | 2 | 3 })
                      }
                    >
                      <option value={1}>H1</option>
                      <option value={2}>H2</option>
                      <option value={3}>H3</option>
                    </select>
                    <input
                      className={fieldClass}
                      value={block.text}
                      onChange={(e) => updateBlock(index, { text: e.target.value })}
                      placeholder="Heading text"
                    />
                  </>
                ) : null}
                {block.type === 'paragraph' ? (
                  <textarea
                    className={fieldClass}
                    rows={3}
                    value={block.text}
                    onChange={(e) => updateBlock(index, { text: e.target.value })}
                    placeholder="Paragraph"
                  />
                ) : null}
                {block.type === 'markdown' ? (
                  <textarea
                    className={fieldClass}
                    rows={5}
                    value={block.markdown}
                    onChange={(e) => updateBlock(index, { markdown: e.target.value })}
                    placeholder="Markdown"
                  />
                ) : null}
                {block.type === 'image' ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      className={fieldClass}
                      value={block.mediaId}
                      onChange={(e) => updateBlock(index, { mediaId: e.target.value })}
                      placeholder="Media asset UUID"
                    />
                    <input
                      className={fieldClass}
                      value={block.alt ?? ''}
                      onChange={(e) => updateBlock(index, { alt: e.target.value })}
                      placeholder="Alt text"
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy || Boolean(page.archivedAt)}>
              Save draft
            </Button>
            <Button
              type="button"
              disabled={busy || Boolean(page.archivedAt)}
              onClick={() => void runAction('publish')}
            >
              Publish
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || Boolean(page.archivedAt)}
              onClick={() => void runAction('unpublish')}
            >
              Unpublish
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || Boolean(page.archivedAt)}
              onClick={() => void runAction('archive')}
            >
              Archive
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
