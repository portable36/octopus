'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiClientError, apiRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

export type PosRegister = {
  readonly id: string;
  readonly storeId: string;
  readonly vendorId: string;
  readonly code: string;
  readonly name: string;
  readonly status: 'ACTIVE' | 'INACTIVE' | 'DECOMMISSIONED';
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

type Props = {
  readonly storeId: string;
  readonly accessToken?: string;
};

export function RegisterManagement({ storeId, accessToken }: Props) {
  const [registers, setRegisters] = useState<readonly PosRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  const authHeaders = useMemo(() => {
    const headers: HeadersInit = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  }, [accessToken]);

  const loadRegisters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<readonly PosRegister[]>(
        `/pos/stores/${encodeURIComponent(storeId)}/registers`,
        { headers: authHeaders },
      );
      setRegisters(data);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load registers.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, storeId]);

  useEffect(() => {
    void loadRegisters();
  }, [loadRegisters]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSubmitting(true);
    try {
      const created = await apiRequest<PosRegister>(
        `/pos/stores/${encodeURIComponent(storeId)}/registers`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            code: code.trim().toUpperCase(),
            name: name.trim(),
            ...(notes.trim() ? { notes: notes.trim() } : {}),
          }),
        },
      );
      setRegisters((prev) => [...prev, created]);
      setCode('');
      setName('');
      setNotes('');
      setShowAddForm(false);
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : 'Failed to create register.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (
    registerId: string,
    newStatus: 'ACTIVE' | 'INACTIVE' | 'DECOMMISSIONED',
  ) => {
    setActionError(null);
    try {
      const updated = await apiRequest<PosRegister>(
        `/pos/stores/${encodeURIComponent(storeId)}/registers/${encodeURIComponent(registerId)}`,
        {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ status: newStatus }),
        },
      );
      setRegisters((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setActionError(
        err instanceof ApiClientError ? err.message : 'Failed to update register status.',
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Registers</h3>
          <p className="text-xs text-muted-foreground">
            Configure physical cash counters, terminals, and checkout stations.
          </p>
        </div>
        {!showAddForm && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setShowAddForm(true);
              setActionError(null);
            }}
          >
            Add Register
          </Button>
        )}
      </div>

      {actionError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
          {actionError}
        </div>
      )}

      {showAddForm && (
        <form
          onSubmit={handleCreate}
          className="space-y-3 rounded-md border border-border bg-muted/20 p-4 text-sm"
        >
          <h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
            New Register
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="reg-code" className="block text-xs font-medium text-muted-foreground">
                Code (e.g. REG-01) *
              </label>
              <input
                id="reg-code"
                type="text"
                required
                maxLength={32}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="REG-01"
                className="mt-1 block w-full rounded border border-border bg-background px-3 py-1.5 text-sm uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="reg-name" className="block text-xs font-medium text-muted-foreground">
                Display Name *
              </label>
              <input
                id="reg-name"
                type="text"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Main Checkout Counter"
                className="mt-1 block w-full rounded border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          </div>
          <div>
            <label htmlFor="reg-notes" className="block text-xs font-medium text-muted-foreground">
              Location / Notes
            </label>
            <input
              id="reg-notes"
              type="text"
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ground floor entrance station"
              className="mt-1 block w-full rounded border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" disabled={submitting || !code.trim() || !name.trim()}>
              {submitting ? 'Creating…' : 'Save Register'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setActionError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading registers…</p>
      ) : error ? (
        <div className="space-y-2">
          <p className="text-xs text-destructive">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadRegisters()}>
            Retry
          </Button>
        </div>
      ) : registers.length === 0 ? (
        <div className="rounded border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No registers configured for this store yet. Click &quot;Add Register&quot; above to set up
          your first checkout station.
        </div>
      ) : (
        <div className="divide-y divide-border rounded border border-border bg-background">
          {registers.map((reg) => (
            <div
              key={reg.id}
              className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between text-sm"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-xs tracking-wide">{reg.code}</span>
                  <span className="font-medium">{reg.name}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      reg.status === 'ACTIVE'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : reg.status === 'INACTIVE'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {reg.status}
                  </span>
                </div>
                {reg.notes && <p className="text-xs text-muted-foreground">{reg.notes}</p>}
              </div>

              {reg.status !== 'DECOMMISSIONED' && (
                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  {reg.status === 'ACTIVE' ? (
                    <button
                      type="button"
                      className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      onClick={() => handleStatusChange(reg.id, 'INACTIVE')}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded border border-border px-2 py-1 text-xs text-emerald-600 hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      onClick={() => handleStatusChange(reg.id, 'ACTIVE')}
                    >
                      Activate
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Are you sure you want to decommission register "${reg.code}"? This cannot be undone.`,
                        )
                      ) {
                        void handleStatusChange(reg.id, 'DECOMMISSIONED');
                      }
                    }}
                  >
                    Decommission
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
