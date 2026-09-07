import { apiRequest } from './api-client';

export interface OfflineReceiptLine {
  readonly name: string;
  readonly sku?: string | null;
  readonly quantity: number;
  readonly lineTotalMinor: number;
}

export interface OfflineReceiptPayment {
  readonly method: string;
  readonly amountPaidMinor: number;
}

export interface OfflineReceiptQueueItem {
  readonly clientTransactionId: string;
  readonly storeId: string;
  readonly createdAt: string;
  readonly soldAt: string;
  readonly cashierName: string;
  readonly registerCode?: string | null;
  readonly lines: readonly OfflineReceiptLine[];
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly taxMinor: number;
  readonly totalMinor: number;
  readonly payments: readonly OfflineReceiptPayment[];
  readonly changeMinor: number;
  readonly currencyCode?: string;
  syncAttempts?: number;
  lastSyncError?: string | null;
}

export interface SyncReceiptResult {
  readonly clientTransactionId: string;
  readonly status: 'SYNCED' | 'ALREADY_SYNCED' | 'REJECTED';
  readonly receiptId?: string;
  readonly receiptNumber?: string;
  readonly error?: string;
}

export interface SyncOfflineReceiptsResponse {
  readonly totalProcessed: number;
  readonly syncedCount: number;
  readonly alreadySyncedCount: number;
  readonly rejectedCount: number;
  readonly results: readonly SyncReceiptResult[];
}

const STORAGE_PREFIX = 'octopus:pos_offline_receipts:v1';

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
}

function getStorageKey(storeId: string): string {
  return `${STORAGE_PREFIX}:${storeId}`;
}

export function getPendingOfflineReceipts(storeId: string): OfflineReceiptQueueItem[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }
  try {
    const raw = storage.getItem(getStorageKey(storeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineReceipt(
  input: Omit<OfflineReceiptQueueItem, 'clientTransactionId' | 'createdAt'> & {
    clientTransactionId?: string;
  },
): OfflineReceiptQueueItem {
  const storage = getStorage();
  if (!storage) {
    throw new Error('Local storage is not available.');
  }

  const clientTransactionId =
    input.clientTransactionId && input.clientTransactionId.trim()
      ? input.clientTransactionId.trim()
      : typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const item: OfflineReceiptQueueItem = {
    ...input,
    clientTransactionId,
    createdAt: new Date().toISOString(),
    syncAttempts: 0,
    lastSyncError: null,
  };

  try {
    const current = getPendingOfflineReceipts(input.storeId);
    const updated = [...current, item];
    storage.setItem(getStorageKey(input.storeId), JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to cache offline receipt in localStorage:', err);
  }

  return item;
}

export function removeOfflineReceipts(
  storeId: string,
  clientTransactionIds: readonly string[],
): void {
  const storage = getStorage();
  if (!storage) return;
  const toRemove = new Set(clientTransactionIds);
  try {
    const current = getPendingOfflineReceipts(storeId);
    const remaining = current.filter((item) => !toRemove.has(item.clientTransactionId));
    storage.setItem(getStorageKey(storeId), JSON.stringify(remaining));
  } catch (err) {
    console.error('Failed to prune offline receipts:', err);
  }
}

export function clearAllOfflineReceipts(storeId: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(getStorageKey(storeId));
  } catch (err) {
    console.error('Failed to clear offline receipts:', err);
  }
}

export async function syncOfflineReceiptsToServer(
  storeId: string,
  accessToken?: string,
): Promise<SyncOfflineReceiptsResponse> {
  const pending = getPendingOfflineReceipts(storeId);
  if (pending.length === 0) {
    return {
      totalProcessed: 0,
      syncedCount: 0,
      alreadySyncedCount: 0,
      rejectedCount: 0,
      results: [],
    };
  }

  const headers: HeadersInit = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const payload = {
    items: pending.map((item) => ({
      clientTransactionId: item.clientTransactionId,
      soldAt: item.soldAt,
      cashierName: item.cashierName,
      registerCode: item.registerCode,
      lines: item.lines,
      subtotalMinor: item.subtotalMinor,
      discountMinor: item.discountMinor,
      taxMinor: item.taxMinor,
      totalMinor: item.totalMinor,
      payments: item.payments,
      changeMinor: item.changeMinor,
      currencyCode: item.currencyCode,
    })),
  };

  const response = await apiRequest<SyncOfflineReceiptsResponse>(
    `/pos/stores/${encodeURIComponent(storeId)}/receipts/sync`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    },
  );

  // Successfully processed or already-synced receipts can be pruned from queue
  const finishedIds = response.results
    .filter((r) => r.status === 'SYNCED' || r.status === 'ALREADY_SYNCED')
    .map((r) => r.clientTransactionId);

  if (finishedIds.length > 0) {
    removeOfflineReceipts(storeId, finishedIds);
  }

  return response;
}
