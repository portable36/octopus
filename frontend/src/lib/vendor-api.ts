import { authedRequest } from '@/lib/auth-api';

export type VendorSummary = {
  id: string;
  status: string;
  profile: { displayName: string; slug: string; description: string | null };
  contact: { email: string; phone: string | null };
  ownerUserId: string;
};

export type StoreSummary = {
  id: string;
  vendorId: string;
  status: string;
  storeCode?: string;
  storeType?: string;
  ownershipKind?: string;
  profile: { displayName: string; slug: string; description: string | null };
  contact?: { phone: string | null; email: string | null; supportEmail: string | null };
  address?: {
    line1: string | null;
    city: string | null;
    region: string | null;
    countryCode: string;
  };
  settings: {
    currencyCode: string;
    timezone?: string;
    locale?: string;
    acceptsOnlineOrders?: boolean;
    codEnabled?: boolean;
  };
};

export type VendorFinanceSummary = {
  vendorId: string;
  currencyCode: string;
  pendingMinor: number;
  availableMinor: number;
  reservedPayoutMinor: number;
  spendableMinor: number;
  rebuiltAt: string | null;
  totalsByType: Readonly<Record<string, number>>;
};

export type VendorLedgerEntry = {
  id: string;
  entryType: string;
  direction: 'CREDIT' | 'DEBIT' | string;
  amountMinor: number;
  currencyCode: string;
  orderId: string | null;
  referenceType: string;
  referenceId: string;
  availableAt: string;
  occurredAt: string;
};

export type VendorPayout = {
  id: string;
  vendorId: string;
  storeId: string;
  amountMinor: number;
  currencyCode: string;
  status: string;
  requestedAt: string;
  completedAt: string | null;
};

export type VendorProduct = {
  id: string;
  vendorId: string;
  sku: string;
  name: string;
  description: string | null;
  brandId: string | null;
  categoryIds: readonly string[];
  status: string;
  attributes: readonly { code: string; value: string | number | boolean | readonly string[] }[];
  media: readonly {
    mediaId: string;
    mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | '360_VIEW';
    isPrimary: boolean;
    sortOrder: number;
  }[];
  variantIds: readonly string[];
};

export type VendorVariant = {
  id: string;
  productId: string;
  sku: string;
  name: string;
  status: string;
  barcode: string | null;
  basePriceMinor: number | null;
  currencyCode: string | null;
};

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  status: string;
};

export type StoreOffer = {
  id: string;
  vendorId: string;
  storeId: string;
  productId: string;
  variantId: string;
  priceMinor: number;
  currencyCode: string;
  status: string;
  isAvailable: boolean;
};

export type VendorOrder = {
  id: string;
  orderNumber: string;
  storeId: string;
  vendorId: string;
  currencyCode: string;
  totalMinor: number;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  updatedAt: string;
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    region?: string;
    postalCode?: string;
    countryCode: string;
  };
  lines: readonly {
    lineId: string;
    productId: string;
    variantId: string;
    quantity: number;
    fulfilledQuantity?: number;
    lineTotalMinor: number;
    currencyCode: string;
  }[];
};

export type VendorShipment = {
  shipmentId: string;
  orderId: string;
  provider: string;
  status: string;
  providerConsignmentId: string | null;
  trackingCode: string | null;
  amountToCollectMinor: number;
  currencyCode: string;
};

export type VendorReturnReason = {
  code: string;
  label: string;
  requiresInspection: boolean;
  customerSelectable: boolean;
  active: boolean;
};

export type VendorReturn = {
  id: string;
  orderId: string;
  status: string;
  customerNote: string | null;
  items: readonly {
    orderItemId: string;
    quantity: number;
    reasonCode: string;
  }[];
  requestedAt: string;
  createdAt: string;
  updatedAt: string;
};

export function formatVendorMoney(minor: number, currencyCode: string): string {
  return `${currencyCode} ${(minor / 100).toFixed(2)}`;
}

export function listMyVendors(): Promise<VendorSummary[]> {
  return authedRequest<VendorSummary[]>('/vendors/mine');
}

export function getVendor(vendorId: string): Promise<VendorSummary> {
  return authedRequest<VendorSummary>(`/vendors/${vendorId}`);
}

export function registerVendor(input: {
  displayName: string;
  legalName: string;
  contactEmail: string;
}): Promise<VendorSummary> {
  return authedRequest<VendorSummary>('/vendors', { method: 'POST', body: input });
}

export function submitVendorForReview(vendorId: string): Promise<VendorSummary> {
  return authedRequest<VendorSummary>(`/vendors/${encodeURIComponent(vendorId)}/submit-review`, {
    method: 'POST',
  });
}

export function listStoresForVendor(vendorId: string): Promise<StoreSummary[]> {
  return authedRequest<StoreSummary[]>(`/stores?vendorId=${encodeURIComponent(vendorId)}`);
}

export function getVendorStore(storeId: string): Promise<StoreSummary> {
  return authedRequest<StoreSummary>(`/stores/${encodeURIComponent(storeId)}`);
}

export function createVendorStore(input: {
  vendorId: string;
  displayName: string;
  description?: string;
  currencyCode?: string;
}): Promise<StoreSummary> {
  return authedRequest<StoreSummary>('/stores', { method: 'POST', body: input });
}

export function activateVendorStore(storeId: string): Promise<StoreSummary> {
  return authedRequest<StoreSummary>(`/stores/${encodeURIComponent(storeId)}/activate`, {
    method: 'POST',
  });
}

export function getVendorFinanceSummary(vendorId: string): Promise<VendorFinanceSummary> {
  return authedRequest<VendorFinanceSummary>(`/finance/vendors/${vendorId}/summary`);
}

export function listVendorPayouts(vendorId: string): Promise<VendorPayout[]> {
  return authedRequest<VendorPayout[]>(`/finance/vendors/${vendorId}/payouts`);
}

export function requestVendorPayout(
  vendorId: string,
  input: { storeId: string; amountMinor: number; currencyCode?: string },
): Promise<VendorPayout> {
  return authedRequest<VendorPayout>(`/finance/vendors/${vendorId}/payouts`, {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: {
      storeId: input.storeId,
      amountMinor: input.amountMinor,
      ...(input.currencyCode ? { currencyCode: input.currencyCode } : {}),
    },
  });
}

export type VendorStatement = {
  vendorId: string;
  total: number;
  limit: number;
  offset: number;
  from: string | null;
  to: string | null;
  items: readonly VendorLedgerEntry[];
};

export function getVendorStatement(
  vendorId: string,
  query: { limit?: number; offset?: number; from?: string; to?: string } = {},
): Promise<VendorStatement> {
  const params = new URLSearchParams();
  if (query.limit != null) params.set('limit', String(query.limit));
  if (query.offset != null) params.set('offset', String(query.offset));
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  const qs = params.toString();
  return authedRequest<VendorStatement>(
    `/finance/vendors/${vendorId}/statement${qs ? `?${qs}` : ''}`,
  );
}

export function listVendorLedger(vendorId: string, limit = 20): Promise<VendorLedgerEntry[]> {
  return authedRequest<VendorLedgerEntry[]>(`/finance/vendors/${vendorId}/ledger?limit=${limit}`);
}

export function listVendorProducts(vendorId: string): Promise<VendorProduct[]> {
  return authedRequest<VendorProduct[]>(`/products?vendorId=${encodeURIComponent(vendorId)}`);
}

export function getVendorProduct(productId: string): Promise<VendorProduct> {
  return authedRequest<VendorProduct>(`/products/${encodeURIComponent(productId)}`);
}

export function updateVendorProduct(
  productId: string,
  input: {
    name?: string;
    description?: string | null;
    brandId?: string | null;
    categoryIds?: string[];
    media?: {
      mediaId: string;
      mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | '360_VIEW';
      isPrimary: boolean;
      sortOrder: number;
    }[];
  },
): Promise<VendorProduct> {
  return authedRequest<VendorProduct>(`/products/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    body: input,
  });
}

export function listProductVariants(productId: string): Promise<VendorVariant[]> {
  return authedRequest<VendorVariant[]>(`/products/${encodeURIComponent(productId)}/variants`);
}

export function listStoreOffers(storeId: string, productId?: string): Promise<StoreOffer[]> {
  const params = new URLSearchParams({ storeId });
  if (productId) {
    params.set('productId', productId);
  }
  return authedRequest<StoreOffer[]>(`/store-offers?${params.toString()}`);
}

export function createVendorProduct(input: {
  vendorId: string;
  sku: string;
  name: string;
  description?: string;
  categoryIds?: string[];
}): Promise<VendorProduct> {
  return authedRequest<VendorProduct>('/products', { method: 'POST', body: input });
}

export function submitProductReview(productId: string): Promise<VendorProduct> {
  return authedRequest<VendorProduct>(`/products/${encodeURIComponent(productId)}/submit-review`, {
    method: 'POST',
  });
}

export function publishProduct(productId: string): Promise<VendorProduct> {
  return authedRequest<VendorProduct>(`/products/${encodeURIComponent(productId)}/publish`, {
    method: 'POST',
  });
}

export function unpublishProduct(productId: string): Promise<VendorProduct> {
  return authedRequest<VendorProduct>(`/products/${encodeURIComponent(productId)}/unpublish`, {
    method: 'POST',
  });
}

export function archiveProduct(productId: string): Promise<VendorProduct> {
  return authedRequest<VendorProduct>(`/products/${encodeURIComponent(productId)}/archive`, {
    method: 'POST',
  });
}

export function createProductVariant(
  productId: string,
  input: {
    name: string;
    sku: string;
    barcode?: string;
    basePriceMinor?: number;
    currencyCode?: string;
  },
): Promise<VendorVariant> {
  return authedRequest<VendorVariant>(`/products/${encodeURIComponent(productId)}/variants`, {
    method: 'POST',
    body: input,
  });
}

export function activateVariant(variantId: string): Promise<VendorVariant> {
  return authedRequest<VendorVariant>(`/variants/${encodeURIComponent(variantId)}/activate`, {
    method: 'POST',
  });
}

export function archiveVariant(variantId: string): Promise<VendorVariant> {
  return authedRequest<VendorVariant>(`/variants/${encodeURIComponent(variantId)}/archive`, {
    method: 'POST',
  });
}

export function listCatalogCategories(): Promise<CatalogCategory[]> {
  return authedRequest<CatalogCategory[]>('/categories');
}

export function createStoreOffer(input: {
  storeId: string;
  variantId: string;
  priceMinor: number;
  currencyCode: string;
}): Promise<StoreOffer> {
  return authedRequest<StoreOffer>('/store-offers', { method: 'POST', body: input });
}

export function activateStoreOffer(offerId: string): Promise<StoreOffer> {
  return authedRequest<StoreOffer>(`/store-offers/${encodeURIComponent(offerId)}/activate`, {
    method: 'POST',
  });
}

export function suspendStoreOffer(offerId: string): Promise<StoreOffer> {
  return authedRequest<StoreOffer>(`/store-offers/${encodeURIComponent(offerId)}/suspend`, {
    method: 'POST',
  });
}

export function updateStoreOfferPrice(
  offerId: string,
  input: { priceMinor: number; currencyCode?: string },
): Promise<StoreOffer> {
  return authedRequest<StoreOffer>(`/store-offers/${encodeURIComponent(offerId)}/price`, {
    method: 'PATCH',
    body: input,
  });
}

export function listStoreOrders(storeId: string): Promise<VendorOrder[]> {
  return authedRequest<VendorOrder[]>(`/orders/stores/${storeId}`);
}

export function getOrder(orderId: string): Promise<VendorOrder> {
  return authedRequest<VendorOrder>(`/orders/${orderId}`);
}

export function startOrderProcessing(orderId: string): Promise<VendorOrder> {
  return authedRequest<VendorOrder>(`/orders/${orderId}/start-processing`, { method: 'POST' });
}

export function completeOrder(orderId: string): Promise<VendorOrder> {
  return authedRequest<VendorOrder>(`/orders/${orderId}/complete`, { method: 'POST' });
}

export function cancelOrder(orderId: string): Promise<VendorOrder> {
  return authedRequest<VendorOrder>(`/orders/${orderId}/cancel`, { method: 'POST' });
}

export function fulfillOrderLine(
  orderId: string,
  lineId: string,
  quantity: number,
): Promise<VendorOrder> {
  return authedRequest<VendorOrder>(`/orders/${orderId}/lines/${lineId}/fulfill`, {
    method: 'POST',
    body: { quantity },
  });
}

export function requestOrderReturn(orderId: string): Promise<VendorOrder> {
  return authedRequest<VendorOrder>(`/orders/${orderId}/request-return`, { method: 'POST' });
}

export function listOrderReturns(orderId: string): Promise<VendorReturn[]> {
  return authedRequest<VendorReturn[]>(`/orders/${orderId}/returns`);
}

export function listReturnReasons(): Promise<VendorReturnReason[]> {
  return authedRequest<VendorReturnReason[]>('/returns/reasons');
}

export function createOrderReturn(input: {
  orderId: string;
  idempotencyKey: string;
  note?: string;
  items: { orderItemId: string; quantity: number; reasonCode: string }[];
}): Promise<VendorReturn> {
  return authedRequest<VendorReturn>(`/orders/${input.orderId}/returns`, {
    method: 'POST',
    headers: { 'Idempotency-Key': input.idempotencyKey },
    body: {
      items: input.items,
      ...(input.note ? { note: input.note } : {}),
    },
  });
}

export function cancelReturn(returnId: string): Promise<VendorReturn> {
  return authedRequest<VendorReturn>(`/returns/${returnId}/cancel`, { method: 'POST' });
}

export function createShipment(input: {
  orderId: string;
  provider: 'STEADFAST' | 'PATHAO' | 'MANUAL';
  lines: { lineId: string; quantity: number }[];
  recipientName: string;
  recipientPhone: string;
  idempotencyKey: string;
  recipientAddress?: string;
  note?: string;
}): Promise<VendorShipment> {
  return authedRequest<VendorShipment>('/fulfillment/shipments', {
    method: 'POST',
    body: input,
  });
}

export function syncShipmentStatus(shipmentId: string): Promise<VendorShipment> {
  return authedRequest<VendorShipment>(`/fulfillment/shipments/${shipmentId}/sync-status`, {
    method: 'POST',
  });
}

export function markShipmentDelivered(
  shipmentId: string,
  input: { idempotencyKey: string; trackingCode?: string },
): Promise<VendorShipment> {
  return authedRequest<VendorShipment>(`/fulfillment/shipments/${shipmentId}/mark-delivered`, {
    method: 'POST',
    body: input,
  });
}

export type WarehouseSummary = {
  id: string;
  vendorId: string;
  storeId: string;
  code: string;
  name: string;
  status: string;
  addressLine: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InventoryItemSummary = {
  id: string;
  vendorId: string;
  storeId: string;
  warehouseId: string;
  variantId: string;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  status: string;
  version: number;
};

export type StockAvailability = {
  variantId: string;
  onHand: number;
  reserved: number;
  available: number;
  stockStatus: string;
  locations: readonly {
    warehouseId: string;
    warehouseName: string;
    onHand: number;
    reserved: number;
    available: number;
    stockStatus: string;
  }[];
};

export function listStoreWarehouses(storeId: string): Promise<WarehouseSummary[]> {
  return authedRequest<WarehouseSummary[]>(`/inventory/stores/${storeId}/warehouses`);
}

export function createStoreWarehouse(
  storeId: string,
  input: { code: string; name: string; addressLine?: string },
): Promise<WarehouseSummary> {
  return authedRequest<WarehouseSummary>(`/inventory/stores/${storeId}/warehouses`, {
    method: 'POST',
    body: input,
  });
}

export function getStoreAvailability(
  storeId: string,
  variantId: string,
): Promise<StockAvailability> {
  return authedRequest<StockAvailability>(
    `/inventory/stores/${storeId}/availability?variantId=${encodeURIComponent(variantId)}`,
  );
}

export function ensureInventoryItem(
  storeId: string,
  input: { warehouseId: string; variantId: string; lowStockThreshold?: number },
): Promise<InventoryItemSummary> {
  return authedRequest<InventoryItemSummary>(`/inventory/stores/${storeId}/items`, {
    method: 'POST',
    body: input,
  });
}

export function receiveStock(
  storeId: string,
  input: {
    warehouseId: string;
    variantId: string;
    quantity: number;
    idempotencyKey: string;
    reason?: string;
  },
): Promise<InventoryItemSummary> {
  return authedRequest<InventoryItemSummary>(`/inventory/stores/${storeId}/receive`, {
    method: 'POST',
    body: input,
  });
}

export function adjustStock(
  storeId: string,
  input: {
    warehouseId: string;
    variantId: string;
    delta: number;
    reason: string;
    idempotencyKey: string;
  },
): Promise<InventoryItemSummary> {
  return authedRequest<InventoryItemSummary>(`/inventory/stores/${storeId}/adjust`, {
    method: 'POST',
    body: input,
  });
}

export function transferStock(
  storeId: string,
  input: {
    sourceWarehouseId: string;
    destinationWarehouseId: string;
    variantId: string;
    quantity: number;
    idempotencyKey: string;
  },
): Promise<{ source: InventoryItemSummary; destination: InventoryItemSummary }> {
  return authedRequest<{ source: InventoryItemSummary; destination: InventoryItemSummary }>(
    `/inventory/stores/${storeId}/transfer`,
    { method: 'POST', body: input },
  );
}
