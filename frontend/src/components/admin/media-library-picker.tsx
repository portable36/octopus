'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  listAdminMedia,
  resolveAdminMediaPreviewUrl,
  uploadAdminPlatformImage,
  fetchAdminMediaLimits,
  type AdminMediaAsset,
  type AdminMediaUploadLimits,
} from '@/lib/admin-media-api';

type MediaLibraryPickerProps = {
  readonly label: string;
  readonly value: string | null;
  readonly onChange: (mediaId: string | null) => void;
};

export function MediaLibraryPicker({ label, value, onChange }: MediaLibraryPickerProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminMediaAsset[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [limits, setLimits] = useState<AdminMediaUploadLimits | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [limitsRes, listRes] = await Promise.all([
        fetchAdminMediaLimits(),
        listAdminMedia({ limit: 24, scope: 'platform' }),
      ]);
      setLimits(limitsRes);
      setItems(listRes.items);
      const previewEntries = await Promise.all(
        listRes.items.map(async (item) => {
          const url = await resolveAdminMediaPreviewUrl(item);
          return [item.id, url] as const;
        }),
      );
      const next: Record<string, string> = {};
      for (const [id, url] of previewEntries) {
        if (url) next[id] = url;
      }
      setPreviews(next);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load media library.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [open, load]);

  async function onUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const asset = await uploadAdminPlatformImage(file, limits);
      onChange(asset.id);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? 'Close library' : 'Choose from library'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!value}
          onClick={() => onChange(null)}
        >
          Clear
        </Button>
        <a href="/admin/system/media" className="text-xs text-muted-foreground underline">
          Open media library
        </a>
      </div>

      {open ? (
        <div className="space-y-3 rounded-md border border-border bg-background p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-foreground">Pick {label}</p>
            <label className="text-xs">
              <span className="sr-only">Upload new</span>
              <input
                type="file"
                accept={limits?.allowedContentTypes.join(',') || 'image/*'}
                disabled={uploading || loading}
                onChange={(e) => {
                  void onUpload(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          {loading ? <p className="text-xs text-muted-foreground">Loading…</p> : null}
          <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`rounded border p-1 text-left transition ${
                  value === item.id ? 'border-foreground ring-1 ring-foreground' : 'border-border'
                }`}
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
              >
                {previews[item.id] ? (
                  <img
                    src={previews[item.id]}
                    alt=""
                    className="mb-1 h-16 w-full rounded object-contain bg-muted"
                  />
                ) : (
                  <div className="mb-1 flex h-16 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                    No preview
                  </div>
                )}
                <span className="line-clamp-2 text-[10px] leading-tight">
                  {item.originalFilename}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
