import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  enqueueOfflineReceipt,
  getPendingOfflineReceipts,
  removeOfflineReceipts,
  clearAllOfflineReceipts,
  syncOfflineReceiptsToServer,
} from './pos-offline-sync';
import * as apiClient from './api-client';

describe('POS Offline Sync', () => {
  const storeId = 'store-test-123';
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }

    const fakeLocalStorage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
    };

    vi.stubGlobal('localStorage', fakeLocalStorage);
    vi.stubGlobal('window', { localStorage: fakeLocalStorage });
  });

  it('enqueues offline receipts and retrieves them', () => {
    const item = enqueueOfflineReceipt({
      storeId,
      soldAt: new Date().toISOString(),
      cashierName: 'Rahim',
      registerCode: 'REG-01',
      lines: [{ name: 'Test Shirt', quantity: 1, lineTotalMinor: 1000 }],
      subtotalMinor: 1000,
      discountMinor: 0,
      taxMinor: 0,
      totalMinor: 1000,
      payments: [{ method: 'CASH', amountPaidMinor: 1000 }],
      changeMinor: 0,
    });

    expect(item.clientTransactionId).toBeDefined();
    const pending = getPendingOfflineReceipts(storeId);
    expect(pending.length).toBe(1);
    expect(pending[0]!.cashierName).toBe('Rahim');
  });

  it('removes synced receipts from local storage queue', () => {
    const item1 = enqueueOfflineReceipt({
      storeId,
      soldAt: new Date().toISOString(),
      cashierName: 'Rahim',
      lines: [{ name: 'Item 1', quantity: 1, lineTotalMinor: 500 }],
      subtotalMinor: 500,
      discountMinor: 0,
      taxMinor: 0,
      totalMinor: 500,
      payments: [{ method: 'CASH', amountPaidMinor: 500 }],
      changeMinor: 0,
    });
    const item2 = enqueueOfflineReceipt({
      storeId,
      soldAt: new Date().toISOString(),
      cashierName: 'Rahim',
      lines: [{ name: 'Item 2', quantity: 1, lineTotalMinor: 700 }],
      subtotalMinor: 700,
      discountMinor: 0,
      taxMinor: 0,
      totalMinor: 700,
      payments: [{ method: 'CASH', amountPaidMinor: 700 }],
      changeMinor: 0,
    });

    expect(getPendingOfflineReceipts(storeId).length).toBe(2);
    removeOfflineReceipts(storeId, [item1.clientTransactionId]);

    const remaining = getPendingOfflineReceipts(storeId);
    expect(remaining.length).toBe(1);
    expect(remaining[0]!.clientTransactionId).toBe(item2.clientTransactionId);

    clearAllOfflineReceipts(storeId);
    expect(getPendingOfflineReceipts(storeId).length).toBe(0);
  });

  it('syncs offline receipts to server and auto-prunes successful ones', async () => {
    const item = enqueueOfflineReceipt({
      storeId,
      soldAt: new Date().toISOString(),
      cashierName: 'Karim',
      lines: [{ name: 'Item 3', quantity: 1, lineTotalMinor: 800 }],
      subtotalMinor: 800,
      discountMinor: 0,
      taxMinor: 0,
      totalMinor: 800,
      payments: [{ method: 'CASH', amountPaidMinor: 800 }],
      changeMinor: 0,
    });

    vi.spyOn(apiClient, 'apiRequest').mockResolvedValueOnce({
      totalProcessed: 1,
      syncedCount: 1,
      alreadySyncedCount: 0,
      rejectedCount: 0,
      results: [
        {
          clientTransactionId: item.clientTransactionId,
          status: 'SYNCED',
          receiptId: 'receipt-123',
          receiptNumber: 'POS-20260907-0099',
        },
      ],
    });

    const res = await syncOfflineReceiptsToServer(storeId, 'test-token');
    expect(res.syncedCount).toBe(1);
    expect(getPendingOfflineReceipts(storeId).length).toBe(0);
  });
});
