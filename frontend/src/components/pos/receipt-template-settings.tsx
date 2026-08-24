'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest, ApiClientError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { ReceiptView } from '@/components/pos/receipt-view';

export type ReceiptTemplateDto = {
  id: string;
  storeId: string;
  vendorId: string;
  displayName: string;
  addressLines: string[];
  phone: string | null;
  website: string | null;
  headerLines: string[];
  footerLines: string[];
  thankYouText: string;
  returnsPolicyText: string;
  showSku: boolean;
  showTax: boolean;
  paperWidth: 58 | 80;
  locale: string;
  currencyCode: string;
  logoMediaId: string | null;
  version: number;
  updatedAt: string;
  updatedBy: string | null;
};

type Props = {
  readonly storeId: string;
  readonly accessToken?: string;
};

function linesToText(lines: readonly string[]): string {
  return lines.join('\n');
}

function textToLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

export function ReceiptTemplateSettings({ storeId, accessToken }: Props) {
  const [template, setTemplate] = useState<ReceiptTemplateDto | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const authHeaders = useMemo(() => {
    const headers: HeadersInit = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  }, [accessToken]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tpl, previewResult] = await Promise.all([
        apiRequest<ReceiptTemplateDto>(`/api/v1/pos/stores/${storeId}/receipt-template`, {
          headers: authHeaders,
        }),
        apiRequest<{ renderedText: string }>(
          `/api/v1/pos/stores/${storeId}/receipt-template/preview`,
          { method: 'POST', headers: authHeaders },
        ),
      ]);
      setTemplate(tpl);
      setPreview(previewResult.renderedText);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load receipt template.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(): Promise<void> {
    if (!template) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<ReceiptTemplateDto>(
        `/api/v1/pos/stores/${storeId}/receipt-template`,
        {
          method: 'PUT',
          headers: authHeaders,
          body: {
            displayName: template.displayName,
            addressLines: template.addressLines,
            phone: template.phone,
            website: template.website,
            headerLines: template.headerLines,
            footerLines: template.footerLines,
            thankYouText: template.thankYouText,
            returnsPolicyText: template.returnsPolicyText,
            showSku: template.showSku,
            showTax: template.showTax,
            paperWidth: template.paperWidth,
            locale: template.locale,
            currencyCode: template.currencyCode,
            logoMediaId: template.logoMediaId,
          },
        },
      );
      setTemplate(updated);
      const previewResult = await apiRequest<{ renderedText: string }>(
        `/api/v1/pos/stores/${storeId}/receipt-template/preview`,
        { method: 'POST', headers: authHeaders },
      );
      setPreview(previewResult.renderedText);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to save receipt template.');
    } finally {
      setSaving(false);
    }
  }

  function patch<K extends keyof ReceiptTemplateDto>(key: K, value: ReceiptTemplateDto[K]): void {
    setTemplate((current) => (current ? { ...current, [key]: value } : current));
  }

  if (loading) {
    return <p className="text-sm text-neutral-600">Loading receipt settings…</p>;
  }

  if (!template) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-700">{error ?? 'Template unavailable.'}</p>
        <Button type="button" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <h2 className="text-lg font-semibold">Receipt template</h2>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <label className="block space-y-1 text-sm">
          <span>Store display name</span>
          <input
            className="w-full rounded border px-3 py-2"
            value={template.displayName}
            onChange={(e) => patch('displayName', e.target.value)}
            required
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Address lines</span>
          <textarea
            className="w-full rounded border px-3 py-2 font-mono text-sm"
            rows={3}
            value={linesToText(template.addressLines)}
            onChange={(e) => patch('addressLines', textToLines(e.target.value))}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span>Phone</span>
            <input
              className="w-full rounded border px-3 py-2"
              value={template.phone ?? ''}
              onChange={(e) => patch('phone', e.target.value || null)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Website</span>
            <input
              className="w-full rounded border px-3 py-2"
              value={template.website ?? ''}
              onChange={(e) => patch('website', e.target.value || null)}
            />
          </label>
        </div>

        <label className="block space-y-1 text-sm">
          <span>Thank-you text</span>
          <textarea
            className="w-full rounded border px-3 py-2"
            rows={3}
            value={template.thankYouText}
            onChange={(e) => patch('thankYouText', e.target.value)}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Returns policy</span>
          <textarea
            className="w-full rounded border px-3 py-2"
            rows={4}
            value={template.returnsPolicyText}
            onChange={(e) => patch('returnsPolicyText', e.target.value)}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Footer lines</span>
          <textarea
            className="w-full rounded border px-3 py-2 font-mono text-sm"
            rows={3}
            value={linesToText(template.footerLines)}
            onChange={(e) => patch('footerLines', textToLines(e.target.value))}
          />
        </label>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={template.showSku}
              onChange={(e) => patch('showSku', e.target.checked)}
            />
            Show SKU
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={template.showTax}
              onChange={(e) => patch('showTax', e.target.checked)}
            />
            Show tax
          </label>
          <label className="inline-flex items-center gap-2">
            Paper
            <select
              className="rounded border px-2 py-1"
              value={template.paperWidth}
              onChange={(e) => patch('paperWidth', Number(e.target.value) as 58 | 80)}
            >
              <option value={58}>58mm</option>
              <option value={80}>80mm</option>
            </select>
          </label>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save template'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              window.print();
            }}
          >
            Print preview
          </Button>
        </div>
        <p className="text-xs text-neutral-500">Version {template.version}</p>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Live preview</h2>
        <p className="text-sm text-neutral-600">Uses sample sale data (not live inventory).</p>
        <ReceiptView text={preview} paperWidth={template.paperWidth} />
      </div>
    </div>
  );
}
