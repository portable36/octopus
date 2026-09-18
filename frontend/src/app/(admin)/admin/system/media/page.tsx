'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  archiveAdminMedia,
  fetchAdminMediaLimits,
  listAdminMedia,
  resolveAdminMediaPreviewUrl,
  uploadAdminPlatformImage,
  type AdminMediaAsset,
  type AdminMediaUploadLimits,
} from '@/lib/admin-media-api';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

export default function AdminMediaLibraryPage() {
  const [limits, setLimits] = useState<AdminMediaUploadLimits | null>(null);
  const [items, setItems] = useState<AdminMediaAsset[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string | null, append = false) => {
      setLoading(true);
      setError(null);
      try {
        const [limitsRes, listRes] = await Promise.all([
          append && limits ? Promise.resolve(limits) : fetchAdminMediaLimits(),
          listAdminMedia({
            limit: 24,
            cursor: cursor ?? null,
            q: q.trim() || null,
            scope: 'platform',
            includeArchived,
          }),
        ]);
        if (!append || !limits) {
          setLimits(limitsRes);
        }
        setItems((prev) => (append ? [...prev, ...listRes.items] : listRes.items));
        setNextCursor(listRes.nextCursor);
        const previewEntries = await Promise.all(
          listRes.items.map(async (item) => {
            const url = await resolveAdminMediaPreviewUrl(item);
            return [item.id, url] as const;
          }),
        );
        setPreviews((prev) => {
          const next = append ? { ...prev } : {};
          for (const [id, url] of previewEntries) {
            if (url) next[id] = url;
          }
          return next;
        });
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load media library.');
      } finally {
        setLoading(false);
      }
    },
    [includeArchived, limits, q],
  );

  useEffect(() => {
    void load(null, false);
    // load identity changes with q/limits; only re-fetch when archive filter flips
  }, [includeArchived]);

  async function onUpload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      const asset = await uploadAdminPlatformImage(file, limits);
      setNotice(`Uploaded ${asset.originalFilename} (${asset.id}).`);
      await load(null, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function onArchive(id: string) {
    if (!window.confirm('Archive this media asset? It will hide from the default library list.')) {
      return;
    }
    setError(null);
    try {
      await archiveAdminMedia(id);
      setNotice('Media archived.');
      await load(null, false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Archive failed.');
    }
  }

  async function copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setNotice(`Copied media ID ${id}`);
    } catch {
      setNotice(id);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Media library"
        description="Upload and manage platform images for branding, favicons, and storefront assets."
      />

      {limits ? (
        <p className="text-sm text-muted-foreground">
          Allowed: {limits.allowedContentTypes.join(', ')}. Max upload size:{' '}
          {formatBytes(limits.maxBytes)}.
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-foreground">Upload image</span>
          <input
            type="file"
            accept={limits?.allowedContentTypes.join(',') || 'image/*'}
            disabled={uploading}
            onChange={(e) => {
              void onUpload(e.target.files);
              e.target.value = '';
            }}
            className="text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-foreground">Search filename</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="min-h-9 rounded-md border border-border bg-background px-3 text-sm"
            placeholder="logo, favicon…"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Include archived
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => void load(null, false)}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Preview</th>
              <th className="px-3 py-2">Filename</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No media yet. Upload a logo or favicon to get started.
                </td>
              </tr>
            ) : null}
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  {previews[item.id] ? (
                    <img
                      src={previews[item.id]}
                      alt=""
                      className="h-12 w-12 rounded object-contain bg-muted"
                    />
                  ) : (
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                      —
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">{item.originalFilename}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{item.id}</div>
                </td>
                <td className="px-3 py-2">{item.contentType}</td>
                <td className="px-3 py-2">{formatBytes(item.byteSize)}</td>
                <td className="px-3 py-2">{item.status}</td>
                <td className="px-3 py-2">{new Date(item.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void copyId(item.id)}
                    >
                      Copy ID
                    </Button>
                    {item.status !== 'archived' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void onArchive(item.id)}
                      >
                        Archive
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {nextCursor ? (
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => void load(nextCursor, true)}
        >
          Load more
        </Button>
      ) : null}
    </div>
  );
}
