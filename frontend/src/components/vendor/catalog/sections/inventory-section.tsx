'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { fieldClass, formClass, labelClass } from '@/components/vendor/catalog/catalog-styles';
import { getDefaultVariant } from '@/lib/vendor-catalog-flow';
import {
  ensureInventoryItem,
  getStoreAvailability,
  receiveStock,
  type StockAvailability,
  type VendorVariant,
  type WarehouseSummary,
} from '@/lib/vendor-api';

type InventorySectionProps = {
  readonly variants: readonly VendorVariant[];
  readonly warehouses: readonly WarehouseSummary[];
  readonly availability: StockAvailability | null;
  readonly storeId: string | null;
  readonly disabled?: boolean;
  readonly onSaved: (availability: StockAvailability | null) => void;
  readonly onError: (message: string) => void;
};

export function InventorySection({
  variants,
  warehouses,
  availability,
  storeId,
  disabled = false,
  onSaved,
  onError,
}: InventorySectionProps) {
  const defaultVariant = getDefaultVariant(variants);
  const [pending, setPending] = useState(false);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '');
  const [quantity, setQuantity] = useState('0');
  const [reason, setReason] = useState('Initial stock');

  useEffect(() => {
    setWarehouseId(warehouses[0]?.id ?? '');
  }, [warehouses]);

  if (!storeId) {
    return (
      <div className={formClass}>
        <h3 className="text-sm font-medium">Inventory</h3>
        <p className="text-sm text-muted-foreground">
          Select a store in the header before managing stock.
        </p>
      </div>
    );
  }

  if (!defaultVariant) {
    return (
      <div className={formClass}>
        <h3 className="text-sm font-medium">Inventory</h3>
        <p className="text-sm text-muted-foreground">
          Save pricing first to create the default variant before receiving stock.
        </p>
      </div>
    );
  }

  if (warehouses.length === 0) {
    return (
      <div className={formClass}>
        <h3 className="text-sm font-medium">Inventory</h3>
        <p className="text-sm text-muted-foreground">
          No warehouses for this store. Create one from the Inventory page first.
        </p>
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeId || !defaultVariant) {
      return;
    }
    const activeStoreId = storeId;
    const variant = defaultVariant;
    const qty = Number.parseInt(quantity, 10);
    if (!warehouseId) {
      onError('Select a warehouse.');
      return;
    }
    if (!Number.isFinite(qty) || qty < 0) {
      onError('Quantity must be a non-negative number.');
      return;
    }

    setPending(true);
    try {
      await ensureInventoryItem(activeStoreId, {
        warehouseId,
        variantId: variant.id,
      });
      if (qty > 0) {
        await receiveStock(activeStoreId, {
          warehouseId,
          variantId: variant.id,
          quantity: qty,
          idempotencyKey: crypto.randomUUID(),
          reason: reason.trim() || 'Initial stock',
        });
      }
      const nextAvailability = await getStoreAvailability(activeStoreId, variant.id);
      onSaved(nextAvailability);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save inventory.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={formClass} onSubmit={onSubmit}>
      <div>
        <h3 className="text-sm font-medium">Inventory</h3>
        <p className="text-sm text-muted-foreground">
          Receive stock for the default variant in the selected store.
        </p>
      </div>

      {availability ? (
        <p className="text-sm text-muted-foreground">
          Current availability: {availability.available} available ({availability.onHand} on hand,{' '}
          {availability.reserved} reserved) · {availability.stockStatus}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No stock recorded yet for this variant.</p>
      )}

      <label className={labelClass}>
        Warehouse
        <select
          className={fieldClass}
          value={warehouseId}
          onChange={(event) => setWarehouseId(event.target.value)}
          disabled={disabled || pending}
        >
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name} ({warehouse.code})
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Quantity to receive
        <input
          className={fieldClass}
          type="number"
          min={0}
          step={1}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          disabled={disabled || pending}
        />
      </label>
      <label className={labelClass}>
        Reason
        <input
          className={fieldClass}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={disabled || pending}
        />
      </label>
      <Button type="submit" disabled={disabled || pending}>
        {pending ? 'Saving…' : 'Save inventory'}
      </Button>
    </form>
  );
}
