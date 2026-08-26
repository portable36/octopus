'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  adjustStock,
  createStoreWarehouse,
  ensureInventoryItem,
  getStoreAvailability,
  listStoreWarehouses,
  receiveStock,
  transferStock,
  type StockAvailability,
  type WarehouseSummary,
} from '@/lib/vendor-api';
import { getSelectedStoreId, subscribeSelectedStoreId } from '@/lib/vendor-session';

const fieldClass = 'h-10 rounded-md border border-border bg-background px-3';
const labelClass = 'flex flex-col gap-1 text-sm';
const formClass = 'max-w-lg space-y-3 rounded-md border border-border bg-background p-4';

function formString(form: FormData, name: string): string {
  return String(form.get(name) || '').trim();
}

function formInt(form: FormData, name: string): number {
  return Number.parseInt(String(form.get(name) || ''), 10);
}

export default function VendorInventoryPage() {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseSummary[] | null>(null);
  const [availability, setAvailability] = useState<StockAvailability | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const sync = () => setStoreId(getSelectedStoreId());
    sync();
    return subscribeSelectedStoreId(sync);
  }, []);

  const reloadWarehouses = useCallback(async (id: string) => {
    const rows = await listStoreWarehouses(id);
    setWarehouses(rows);
  }, []);

  useEffect(() => {
    if (!storeId) {
      setWarehouses(null);
      setAvailability(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await reloadWarehouses(storeId);
        if (!cancelled) {
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load warehouses.');
          setWarehouses([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId, reloadWarehouses]);

  async function runMutation(action: () => Promise<void>) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Request failed.');
    } finally {
      setPending(false);
    }
  }

  if (!storeId) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Inventory</h2>
        <p className="text-sm text-muted-foreground">
          Select a store in the header to manage warehouses and stock.
        </p>
      </div>
    );
  }

  const activeStoreId = storeId;

  async function onCreateWarehouse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const el = event.currentTarget;
    const form = new FormData(el);
    const addressLine = formString(form, 'addressLine');
    await runMutation(async () => {
      await createStoreWarehouse(activeStoreId, {
        code: formString(form, 'code'),
        name: formString(form, 'name'),
        ...(addressLine ? { addressLine } : {}),
      });
      await reloadWarehouses(activeStoreId);
      setMessage('Warehouse created.');
      el.reset();
    });
  }

  async function onLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const variantId = formString(form, 'variantId');
    await runMutation(async () => {
      const result = await getStoreAvailability(activeStoreId, variantId);
      setAvailability(result);
      setMessage(`Availability for ${variantId}: ${result.available} available.`);
    });
  }

  async function onEnsure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const thresholdRaw = formString(form, 'lowStockThreshold');
    const threshold = thresholdRaw === '' ? undefined : Number.parseInt(thresholdRaw, 10);
    await runMutation(async () => {
      const item = await ensureInventoryItem(activeStoreId, {
        warehouseId: formString(form, 'warehouseId'),
        variantId: formString(form, 'variantId'),
        ...(threshold !== undefined && !Number.isNaN(threshold)
          ? { lowStockThreshold: threshold }
          : {}),
      });
      setMessage(`Item ready (${item.available} available).`);
    });
  }

  async function onReceive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reason = formString(form, 'reason');
    await runMutation(async () => {
      const item = await receiveStock(activeStoreId, {
        warehouseId: formString(form, 'warehouseId'),
        variantId: formString(form, 'variantId'),
        quantity: formInt(form, 'quantity'),
        idempotencyKey: crypto.randomUUID(),
        ...(reason ? { reason } : {}),
      });
      setMessage(`Received. On-hand ${item.onHand}, available ${item.available}.`);
    });
  }

  async function onAdjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await runMutation(async () => {
      const item = await adjustStock(activeStoreId, {
        warehouseId: formString(form, 'warehouseId'),
        variantId: formString(form, 'variantId'),
        delta: formInt(form, 'delta'),
        reason: formString(form, 'reason'),
        idempotencyKey: crypto.randomUUID(),
      });
      setMessage(`Adjusted. On-hand ${item.onHand}, available ${item.available}.`);
    });
  }

  async function onTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await runMutation(async () => {
      const result = await transferStock(activeStoreId, {
        sourceWarehouseId: formString(form, 'sourceWarehouseId'),
        destinationWarehouseId: formString(form, 'destinationWarehouseId'),
        variantId: formString(form, 'variantId'),
        quantity: formInt(form, 'quantity'),
        idempotencyKey: crypto.randomUUID(),
      });
      setMessage(
        `Transferred. Source available ${result.source.available}; destination ${result.destination.available}.`,
      );
    });
  }

  const warehouseOptions = warehouses ?? [];

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">Inventory</h2>
        <p className="text-sm text-muted-foreground">
          Store-scoped warehouses, stock lookup, receive, adjust, and transfer.
        </p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{activeStoreId}</p>
      </header>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Warehouses</h3>
        {warehouses === null ? (
          <p className="text-sm text-muted-foreground">Loading warehouses…</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-background">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Address</th>
                </tr>
              </thead>
              <tbody>
                {warehouseOptions.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                      No warehouses yet.
                    </td>
                  </tr>
                ) : (
                  warehouseOptions.map((wh) => (
                    <tr key={wh.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{wh.code}</td>
                      <td className="px-3 py-2">{wh.name}</td>
                      <td className="px-3 py-2">{wh.status}</td>
                      <td className="px-3 py-2 text-muted-foreground">{wh.addressLine ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={(e) => void onCreateWarehouse(e)} className={formClass}>
          <p className="text-sm font-medium">Create warehouse</p>
          <label className={labelClass}>
            <span className="text-muted-foreground">Code</span>
            <input name="code" required maxLength={40} className={fieldClass} />
          </label>
          <label className={labelClass}>
            <span className="text-muted-foreground">Name</span>
            <input name="name" required maxLength={160} className={fieldClass} />
          </label>
          <label className={labelClass}>
            <span className="text-muted-foreground">Address (optional)</span>
            <input name="addressLine" maxLength={240} className={fieldClass} />
          </label>
          <Button type="submit" size="sm" disabled={pending}>
            Create
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Stock lookup</h3>
        <form onSubmit={(e) => void onLookup(e)} className={formClass}>
          <label className={labelClass}>
            <span className="text-muted-foreground">Variant ID</span>
            <input name="variantId" required className={fieldClass} />
          </label>
          <Button type="submit" size="sm" disabled={pending}>
            Lookup
          </Button>
        </form>
        {availability ? (
          <div className="overflow-x-auto rounded-md border border-border bg-background">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Warehouse</th>
                  <th className="px-3 py-2 font-medium">On hand</th>
                  <th className="px-3 py-2 font-medium">Reserved</th>
                  <th className="px-3 py-2 font-medium">Available</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {availability.locations.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
                      No stock rows for this variant.
                    </td>
                  </tr>
                ) : (
                  availability.locations.map((loc) => (
                    <tr key={loc.warehouseId} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">{loc.warehouseName}</td>
                      <td className="px-3 py-2 tabular-nums">{loc.onHand}</td>
                      <td className="px-3 py-2 tabular-nums">{loc.reserved}</td>
                      <td className="px-3 py-2 tabular-nums">{loc.available}</td>
                      <td className="px-3 py-2">{loc.stockStatus}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Ensure item</h3>
        <form onSubmit={(e) => void onEnsure(e)} className={formClass}>
          <WarehouseSelect warehouses={warehouseOptions} name="warehouseId" />
          <label className={labelClass}>
            <span className="text-muted-foreground">Variant ID</span>
            <input name="variantId" required className={fieldClass} />
          </label>
          <label className={labelClass}>
            <span className="text-muted-foreground">Low-stock threshold (optional)</span>
            <input name="lowStockThreshold" type="number" min={0} className={fieldClass} />
          </label>
          <Button type="submit" size="sm" disabled={pending || warehouseOptions.length === 0}>
            Ensure
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Receive</h3>
        <form onSubmit={(e) => void onReceive(e)} className={formClass}>
          <WarehouseSelect warehouses={warehouseOptions} name="warehouseId" />
          <label className={labelClass}>
            <span className="text-muted-foreground">Variant ID</span>
            <input name="variantId" required className={fieldClass} />
          </label>
          <label className={labelClass}>
            <span className="text-muted-foreground">Quantity</span>
            <input name="quantity" type="number" required min={1} className={fieldClass} />
          </label>
          <label className={labelClass}>
            <span className="text-muted-foreground">Reason (optional)</span>
            <input name="reason" maxLength={240} className={fieldClass} />
          </label>
          <Button type="submit" size="sm" disabled={pending || warehouseOptions.length === 0}>
            Receive
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Adjust</h3>
        <form onSubmit={(e) => void onAdjust(e)} className={formClass}>
          <WarehouseSelect warehouses={warehouseOptions} name="warehouseId" />
          <label className={labelClass}>
            <span className="text-muted-foreground">Variant ID</span>
            <input name="variantId" required className={fieldClass} />
          </label>
          <label className={labelClass}>
            <span className="text-muted-foreground">Delta</span>
            <input name="delta" type="number" required className={fieldClass} />
          </label>
          <label className={labelClass}>
            <span className="text-muted-foreground">Reason</span>
            <input name="reason" required maxLength={240} className={fieldClass} />
          </label>
          <Button type="submit" size="sm" disabled={pending || warehouseOptions.length === 0}>
            Adjust
          </Button>
        </form>
      </section>

      {warehouseOptions.length >= 2 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-medium">Transfer</h3>
          <form onSubmit={(e) => void onTransfer(e)} className={formClass}>
            <WarehouseSelect
              warehouses={warehouseOptions}
              name="sourceWarehouseId"
              label="Source warehouse"
            />
            <WarehouseSelect
              warehouses={warehouseOptions}
              name="destinationWarehouseId"
              label="Destination warehouse"
            />
            <label className={labelClass}>
              <span className="text-muted-foreground">Variant ID</span>
              <input name="variantId" required className={fieldClass} />
            </label>
            <label className={labelClass}>
              <span className="text-muted-foreground">Quantity</span>
              <input name="quantity" type="number" required min={1} className={fieldClass} />
            </label>
            <Button type="submit" size="sm" disabled={pending}>
              Transfer
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function WarehouseSelect({
  warehouses,
  name,
  label = 'Warehouse',
}: {
  readonly warehouses: readonly WarehouseSummary[];
  readonly name: string;
  readonly label?: string;
}) {
  return (
    <label className={labelClass}>
      <span className="text-muted-foreground">{label}</span>
      <select name={name} required className={fieldClass} disabled={warehouses.length === 0}>
        <option value="">Select…</option>
        {warehouses.map((wh) => (
          <option key={wh.id} value={wh.id}>
            {wh.code} — {wh.name}
          </option>
        ))}
      </select>
    </label>
  );
}
