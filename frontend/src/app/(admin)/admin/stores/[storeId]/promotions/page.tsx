'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { apiRequest, ApiClientError } from '@/lib/api-client';
import { useAccessToken } from '@/lib/use-access-token';
import { formatMoney } from '@/lib/storefront-api';

export type PromotionScope = 'ALL' | 'PRODUCT' | 'CATEGORY' | 'VENDOR' | 'STORE';
export type DiscountType = 'PERCENTAGE' | 'FIXED';
export type PromotionStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED';

export interface PromotionItem {
  readonly id: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly name: string;
  readonly couponCode: string | null;
  readonly discountType: DiscountType;
  readonly discountValue: number;
  readonly currencyCode: string;
  readonly minOrderAmountMinor: number;
  readonly scope: PromotionScope;
  readonly scopeIds: readonly string[];
  readonly usageLimit: number | null;
  readonly usageCount: number;
  readonly perCustomerLimit: number | null;
  readonly startsAt: string;
  readonly endsAt: string | null;
  readonly status: PromotionStatus;
}

export default function AdminStorePromotionsPage() {
  const params = useParams<{ storeId: string }>();
  const token = useAccessToken();
  const storeId = params.storeId;

  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState(10);
  const [currencyCode, setCurrencyCode] = useState('BDT');
  const [minOrderAmount, setMinOrderAmount] = useState(0);
  const [scope, setScope] = useState<PromotionScope>('STORE');
  const [scopeIds, setScopeIds] = useState('');
  const [usageLimit, setUsageLimit] = useState<number | ''>('');
  const [perCustomerLimit, setPerCustomerLimit] = useState<number | ''>('');
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [endsAt, setEndsAt] = useState('');
  const [autoActivate, setAutoActivate] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadPromotions = useCallback(async () => {
    if (!token || !storeId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<PromotionItem[]>(
        `/pricing/stores/${encodeURIComponent(storeId)}/promotions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setPromotions(data);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load promotions.');
    } finally {
      setLoading(false);
    }
  }, [token, storeId]);

  useEffect(() => {
    void loadPromotions();
  }, [loadPromotions]);

  const handleActivate = async (promotionId: string) => {
    if (!token || !storeId) return;
    setPendingActionId(promotionId);
    try {
      await apiRequest(
        `/pricing/stores/${encodeURIComponent(storeId)}/promotions/${encodeURIComponent(promotionId)}/activate`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      await loadPromotions();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Activation failed.');
    } finally {
      setPendingActionId(null);
    }
  };

  const handleDisable = async (promotionId: string) => {
    if (!token || !storeId) return;
    setPendingActionId(promotionId);
    try {
      await apiRequest(
        `/pricing/stores/${encodeURIComponent(storeId)}/promotions/${encodeURIComponent(promotionId)}/disable`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      await loadPromotions();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Disable failed.');
    } finally {
      setPendingActionId(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !storeId) return;
    setSubmitting(true);
    setCreateError(null);

    const parsedScopeIds = scopeIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await apiRequest<PromotionItem>(`/pricing/stores/${encodeURIComponent(storeId)}/promotions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          name: name.trim(),
          couponCode: couponCode.trim() ? couponCode.trim().toUpperCase() : undefined,
          discountType,
          discountValue: Number(discountValue),
          currencyCode: currencyCode.trim().toUpperCase(),
          minOrderAmountMinor: Math.round(Number(minOrderAmount) * 100),
          scope,
          ...(parsedScopeIds.length > 0 ? { scopeIds: parsedScopeIds } : {}),
          ...(usageLimit !== '' ? { usageLimit: Number(usageLimit) } : {}),
          ...(perCustomerLimit !== '' ? { perCustomerLimit: Number(perCustomerLimit) } : {}),
          startsAt: new Date(startsAt).toISOString(),
          ...(endsAt ? { endsAt: new Date(endsAt).toISOString() } : {}),
          activate: autoActivate,
        },
      });
      setShowCreateModal(false);
      // Reset form
      setName('');
      setCouponCode('');
      setDiscountValue(10);
      setMinOrderAmount(0);
      setScope('STORE');
      setScopeIds('');
      setUsageLimit('');
      setPerCustomerLimit('');
      setEndsAt('');
      await loadPromotions();
    } catch (err) {
      setCreateError(err instanceof ApiClientError ? err.message : 'Failed to create promotion.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Promotions & Coupons</h2>
          <p className="text-xs text-muted-foreground">
            Authoritative discount rules, coupon codes, and automatic cart promotions.
          </p>
        </div>
        <Button
          type="button"
          className="sf-button-primary h-9 text-xs"
          onClick={() => setShowCreateModal(true)}
        >
          + Create Promotion
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading promotions…</p>
      ) : promotions.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm font-semibold">No promotions yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create coupon codes or automatic discounts to drive sales in this store.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 text-xs"
            onClick={() => setShowCreateModal(true)}
          >
            Create first promotion
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40 font-medium text-muted-foreground">
              <tr>
                <th className="p-3">Promotion</th>
                <th className="p-3">Type & Scope</th>
                <th className="p-3">Discount</th>
                <th className="p-3">Min Order</th>
                <th className="p-3">Usage</th>
                <th className="p-3">Validity</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {promotions.map((p) => (
                <tr key={p.id} className="hover:bg-muted/10">
                  <td className="p-3 font-medium">
                    <div>{p.name}</div>
                    {p.couponCode ? (
                      <span className="inline-block mt-0.5 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                        {p.couponCode}
                      </span>
                    ) : (
                      <span className="inline-block mt-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        Automatic
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    <div>{p.scope}</div>
                    {p.scopeIds.length > 0 ? (
                      <div className="text-[10px] text-muted-foreground/75">
                        {p.scopeIds.length} target(s)
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3 font-semibold">
                    {p.discountType === 'PERCENTAGE'
                      ? `${p.discountValue}%`
                      : formatMoney(p.discountValue, p.currencyCode)}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {p.minOrderAmountMinor > 0
                      ? formatMoney(p.minOrderAmountMinor, p.currencyCode)
                      : 'None'}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {p.usageCount}
                    {p.usageLimit !== null ? ` / ${p.usageLimit}` : ' (unlimited)'}
                  </td>
                  <td className="p-3 text-[11px] text-muted-foreground">
                    <div>From: {new Date(p.startsAt).toLocaleDateString()}</div>
                    {p.endsAt ? <div>To: {new Date(p.endsAt).toLocaleDateString()}</div> : null}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        p.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : p.status === 'DRAFT'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {p.status === 'ACTIVE' ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pendingActionId === p.id}
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => void handleDisable(p.id)}
                      >
                        Disable
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pendingActionId === p.id}
                        className="h-7 text-xs"
                        onClick={() => void handleActivate(p.id)}
                      >
                        Activate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Promotion Modal */}
      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold">Create Promotion</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Configure coupon codes or automatic discounts evaluated by the discount matrix.
            </p>

            {createError ? (
              <p className="mt-3 rounded bg-destructive/10 p-2 text-xs text-destructive">
                {createError}
              </p>
            ) : null}

            <form onSubmit={(e) => void handleCreateSubmit(e)} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium">Promotion Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Summer Special 15%"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium">Coupon Code (optional)</label>
                  <input
                    type="text"
                    placeholder="Leave blank for automatic"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 uppercase"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Blank = auto-applied to eligible carts
                  </span>
                </div>
                <div>
                  <label className="block font-medium">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (Minor)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium">
                    {discountType === 'PERCENTAGE' ? 'Discount Percent (1-100)' : 'Discount Amount'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={discountType === 'PERCENTAGE' ? 100 : undefined}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-medium">Currency</label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium">Min Order Amount ({currencyCode})</label>
                  <input
                    type="number"
                    min={0}
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-medium">Scope</label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as PromotionScope)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
                  >
                    <option value="STORE">Storewide</option>
                    <option value="PRODUCT">Specific Products</option>
                    <option value="CATEGORY">Specific Categories</option>
                    <option value="VENDOR">Vendorwide</option>
                    <option value="ALL">Platform All</option>
                  </select>
                </div>
              </div>

              {scope === 'PRODUCT' || scope === 'CATEGORY' ? (
                <div>
                  <label className="block font-medium">
                    Target IDs (comma-separated {scope.toLowerCase()} UUIDs)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="id-1, id-2, id-3"
                    value={scopeIds}
                    onChange={(e) => setScopeIds(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
                  />
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium">Total Usage Limit (optional)</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Unlimited"
                    value={usageLimit}
                    onChange={(e) =>
                      setUsageLimit(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-medium">Per-Customer Limit (optional)</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Unlimited"
                    value={perCustomerLimit}
                    onChange={(e) =>
                      setPerCustomerLimit(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium">Starts At</label>
                  <input
                    type="datetime-local"
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-medium">Ends At (optional)</label>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="auto-activate"
                  checked={autoActivate}
                  onChange={(e) => setAutoActivate(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="auto-activate" className="font-medium">
                  Activate immediately upon creation
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Save Promotion'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
