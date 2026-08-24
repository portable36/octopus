import { describe, expect, it } from 'vitest';
import { InsufficientStockError, InvalidStockQuantityError } from '../errors/inventory.errors';
import { InventoryItem } from './inventory-item.aggregate';
import { InventoryReservation } from './inventory-reservation.aggregate';
import { Warehouse } from './warehouse.aggregate';
import { stockStatus } from '../inventory.types';
import { StockQuantity } from '../value-objects/stock-quantity.vo';

const ids = {
  vendorId: '00000000-0000-7000-8000-000000000001',
  storeId: '00000000-0000-7000-8000-000000000002',
  warehouseId: '00000000-0000-7000-8000-000000000003',
  variantId: '00000000-0000-7000-8000-000000000004',
};

describe('StockQuantity', () => {
  it('rejects negatives and non-integers', () => {
    expect(() => StockQuantity.of(-1)).toThrow(InvalidStockQuantityError);
    expect(() => StockQuantity.of(1.5)).toThrow(InvalidStockQuantityError);
    expect(StockQuantity.of(0).value).toBe(0);
  });
});

describe('InventoryItem', () => {
  it('keeps available = onHand - reserved and blocks oversell', () => {
    const item = InventoryItem.create(ids);
    item.receive(10);
    expect(item.available).toBe(10);
    item.reserve(4);
    expect(item.onHand).toBe(10);
    expect(item.reserved).toBe(4);
    expect(item.available).toBe(6);
    expect(() => item.reserve(7)).toThrow(InsufficientStockError);
  });

  it('never allows negative on-hand or reserved > onHand', () => {
    const item = InventoryItem.create(ids);
    item.receive(5);
    item.reserve(3);
    expect(() => item.adjust(-3, 'shrink')).toThrow(/Reserved/);
    expect(() => item.adjust(-6, 'shrink')).toThrow(/negative/);
  });

  it('deducts reserved and on-hand together', () => {
    const item = InventoryItem.create(ids);
    item.receive(8);
    item.reserve(3);
    const result = item.deduct(3);
    expect(result.afterOnHand).toBe(5);
    expect(result.afterReserved).toBe(0);
    expect(item.available).toBe(5);
  });

  it('releases reservation quantity back to available', () => {
    const item = InventoryItem.create(ids);
    item.receive(5);
    item.reserve(2);
    item.release(2);
    expect(item.reserved).toBe(0);
    expect(item.available).toBe(5);
  });
});

describe('Warehouse + Reservation', () => {
  it('creates warehouse and active reservation', () => {
    const warehouse = Warehouse.create({
      vendorId: ids.vendorId,
      storeId: ids.storeId,
      code: 'main',
      name: 'Main Warehouse',
    });
    expect(warehouse.code).toBe('MAIN');
    const reservation = InventoryReservation.createActive({
      ...ids,
      inventoryItemId: '00000000-0000-7000-8000-000000000005',
      orderId: 'ORD-1',
      quantity: 2,
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect(reservation.status).toBe('ACTIVE');
    reservation.release();
    expect(reservation.status).toBe('RELEASED');
  });
});

describe('stockStatus', () => {
  it('maps thresholds', () => {
    expect(stockStatus(0, 5)).toBe('OUT_OF_STOCK');
    expect(stockStatus(3, 5)).toBe('LOW_STOCK');
    expect(stockStatus(10, 5)).toBe('IN_STOCK');
  });
});
