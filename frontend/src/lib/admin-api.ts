import { apiRequest } from '@/lib/api-client';

export type VendorStaffRole = 'VENDOR_OWNER' | 'VENDOR_STAFF';
export type StoreStaffRole = 'STORE_MANAGER' | 'STORE_STAFF';

export type AdminStaffMember = {
  userId: string;
  role: string;
  addedAt: string;
};

/** COD + commerce fields returned on vendor/store detail and settings PATCH. */
export type AdminCommerceSettings = {
  currencyCode?: string;
  timezone?: string;
  locale?: string;
  acceptsOnlineOrders?: boolean;
  codEnabled?: boolean;
  codMinAmountMinor?: number;
  codMaxAmountMinor?: number | null;
  codReservationTtlHours?: number;
};

export type VendorSettingsPatch = {
  currencyCode?: string;
  timezone?: string;
  acceptsOnlineOrders?: boolean;
  codEnabled?: boolean;
  codMinAmountMinor?: number;
  codMaxAmountMinor?: number | null;
  codReservationTtlHours?: number;
};

export type StoreSettingsPatch = VendorSettingsPatch & {
  locale?: string;
};

export type AdminVendor = {
  id: string;
  status: string;
  profile: { displayName: string; slug: string; description?: string | null };
  business?: { legalName?: string; registrationNumber?: string | null; taxId?: string | null };
  contact: { email: string; phone?: string | null };
  settings?: AdminCommerceSettings;
  ownerUserId: string;
  rejectionReason: string | null;
  staff: AdminStaffMember[];
};

export type AdminStore = {
  id: string;
  vendorId: string;
  storeCode?: string;
  storeType?: string;
  status: string;
  profile: { displayName: string; slug: string; description?: string | null };
  address?: Record<string, unknown> | null;
  contact?: { phone?: string | null; email?: string | null; supportEmail?: string | null };
  settings?: AdminCommerceSettings;
  staff: AdminStaffMember[];
};

export type AdminStoreListItem = {
  id: string;
  vendorId: string;
  vendorDisplayName: string | null;
  storeCode: string;
  storeType: string;
  status: string;
  profile: { displayName: string; slug: string; description: string | null };
  location: { city: string | null; region: string | null; countryCode: string };
  createdAt: string;
};

export type AdminStoreListResponse = {
  items: AdminStoreListItem[];
  total: number;
  page: number;
  limit: number;
};

export type AdminStoreStats = {
  total: number;
  byStatus: Record<string, number>;
};

export type AdminStoreHealth = {
  storeId: string;
  score: 'OK' | 'WARNING' | 'CRITICAL';
  checks: readonly {
    key: string;
    label: string;
    ok: boolean;
    severity: 'OK' | 'WARNING' | 'CRITICAL';
    detail: string;
  }[];
};

export type AdminStoreOverview = {
  store: AdminStore;
  health: AdminStoreHealth;
  provisioning: {
    runId: string;
    status: string;
    lastError: string | null;
    startedAt: string;
    completedAt: string | null;
  } | null;
  metrics: {
    orders: { available: false; reason: string };
    revenue: { available: false; reason: string };
  };
};

export type AdminStoreListParams = {
  q?: string;
  status?: string;
  vendorId?: string;
  storeType?: string;
  country?: string;
  page?: number;
  limit?: number;
  sort?: string;
};

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function listAdminVendors(token: string): Promise<AdminVendor[]> {
  return apiRequest<AdminVendor[]>('/admin/vendors', { headers: authHeaders(token) });
}

export function createAdminVendor(
  token: string,
  input: {
    ownerUserId: string;
    displayName: string;
    legalName: string;
    contactEmail: string;
  },
): Promise<AdminVendor> {
  return apiRequest<AdminVendor>('/admin/vendors', {
    method: 'POST',
    headers: authHeaders(token),
    body: input,
  });
}

export function getAdminVendor(token: string, vendorId: string): Promise<AdminVendor> {
  return apiRequest<AdminVendor>(`/admin/vendors/${encodeURIComponent(vendorId)}`, {
    headers: authHeaders(token),
  });
}

export function approveVendor(token: string, vendorId: string): Promise<AdminVendor> {
  return apiRequest<AdminVendor>(`/vendors/${encodeURIComponent(vendorId)}/approve`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export function rejectVendor(
  token: string,
  vendorId: string,
  reason: string,
): Promise<AdminVendor> {
  return apiRequest<AdminVendor>(`/vendors/${encodeURIComponent(vendorId)}/reject`, {
    method: 'POST',
    headers: authHeaders(token),
    body: { reason },
  });
}

export function activateVendor(token: string, vendorId: string): Promise<AdminVendor> {
  return apiRequest<AdminVendor>(`/vendors/${encodeURIComponent(vendorId)}/activate`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export function suspendVendor(
  token: string,
  vendorId: string,
  reason?: string,
): Promise<AdminVendor> {
  return apiRequest<AdminVendor>(`/vendors/${encodeURIComponent(vendorId)}/suspend`, {
    method: 'POST',
    headers: authHeaders(token),
    body: reason !== undefined && reason !== '' ? { reason } : {},
  });
}

export function reopenVendor(token: string, vendorId: string): Promise<AdminVendor> {
  return apiRequest<AdminVendor>(`/vendors/${encodeURIComponent(vendorId)}/reopen`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export function updateVendorSettings(
  token: string,
  vendorId: string,
  patch: VendorSettingsPatch,
): Promise<AdminVendor> {
  return apiRequest<AdminVendor>(`/vendors/${encodeURIComponent(vendorId)}/settings`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: patch,
  });
}

export function addVendorStaff(
  token: string,
  vendorId: string,
  userId: string,
  role: VendorStaffRole,
): Promise<AdminVendor> {
  return apiRequest<AdminVendor>(`/vendors/${encodeURIComponent(vendorId)}/staff`, {
    method: 'POST',
    headers: authHeaders(token),
    body: { userId, role },
  });
}

export function removeVendorStaff(
  token: string,
  vendorId: string,
  staffUserId: string,
): Promise<AdminVendor> {
  return apiRequest<AdminVendor>(
    `/vendors/${encodeURIComponent(vendorId)}/staff/${encodeURIComponent(staffUserId)}`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
}

export function listAdminStores(
  token: string,
  params: AdminStoreListParams = {},
): Promise<AdminStoreListResponse> {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.status) search.set('status', params.status);
  if (params.vendorId) search.set('vendorId', params.vendorId);
  if (params.storeType) search.set('storeType', params.storeType);
  if (params.country) search.set('country', params.country);
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.sort) search.set('sort', params.sort);
  const qs = search.toString();
  return apiRequest<AdminStoreListResponse>(`/admin/stores${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(token),
  });
}

export function getAdminStoreStats(token: string): Promise<AdminStoreStats> {
  return apiRequest<AdminStoreStats>('/admin/stores/stats', { headers: authHeaders(token) });
}

export function getAdminStore(token: string, storeId: string): Promise<AdminStore> {
  return apiRequest<AdminStore>(`/admin/stores/${encodeURIComponent(storeId)}`, {
    headers: authHeaders(token),
  });
}

export function getAdminStoreOverview(token: string, storeId: string): Promise<AdminStoreOverview> {
  return apiRequest<AdminStoreOverview>(`/admin/stores/${encodeURIComponent(storeId)}/overview`, {
    headers: authHeaders(token),
  });
}

export function getAdminStoreHealth(token: string, storeId: string): Promise<AdminStoreHealth> {
  return apiRequest<AdminStoreHealth>(`/admin/stores/${encodeURIComponent(storeId)}/health`, {
    headers: authHeaders(token),
  });
}

export type AdminProvisioningStatus = {
  run: {
    id: string;
    storeId: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    lastError: string | null;
  };
  steps: readonly {
    stepName: string;
    status: string;
    error: string | null;
    retryCount: number;
  }[];
};

export function getAdminStoreProvisioning(
  token: string,
  storeId: string,
): Promise<AdminProvisioningStatus> {
  return apiRequest<AdminProvisioningStatus>(
    `/admin/stores/${encodeURIComponent(storeId)}/provisioning`,
    { headers: authHeaders(token) },
  );
}

export function retryAdminStoreProvisioning(
  token: string,
  storeId: string,
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(
    `/admin/stores/${encodeURIComponent(storeId)}/provisioning/retry`,
    { method: 'POST', headers: authHeaders(token) },
  );
}

export function activateStore(token: string, storeId: string): Promise<AdminStore> {
  return apiRequest<AdminStore>(`/admin/stores/${encodeURIComponent(storeId)}/activate`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export function suspendStore(token: string, storeId: string, reason?: string): Promise<AdminStore> {
  return apiRequest<AdminStore>(`/admin/stores/${encodeURIComponent(storeId)}/suspend`, {
    method: 'POST',
    headers: authHeaders(token),
    body: reason !== undefined && reason !== '' ? { reason } : {},
  });
}

export function maintenanceStore(
  token: string,
  storeId: string,
  reason?: string,
): Promise<AdminStore> {
  return apiRequest<AdminStore>(`/admin/stores/${encodeURIComponent(storeId)}/maintenance`, {
    method: 'POST',
    headers: authHeaders(token),
    body: reason !== undefined && reason !== '' ? { reason } : {},
  });
}

export function archiveStore(token: string, storeId: string): Promise<AdminStore> {
  return apiRequest<AdminStore>(`/admin/stores/${encodeURIComponent(storeId)}/archive`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export function updateStoreSettings(
  token: string,
  storeId: string,
  patch: StoreSettingsPatch,
): Promise<AdminStore> {
  return apiRequest<AdminStore>(`/stores/${encodeURIComponent(storeId)}/settings`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: patch,
  });
}

export function addStoreStaff(
  token: string,
  storeId: string,
  userId: string,
  role: StoreStaffRole,
): Promise<AdminStore> {
  return apiRequest<AdminStore>(`/stores/${encodeURIComponent(storeId)}/staff`, {
    method: 'POST',
    headers: authHeaders(token),
    body: { userId, role },
  });
}

export function removeStoreStaff(
  token: string,
  storeId: string,
  staffUserId: string,
): Promise<AdminStore> {
  return apiRequest<AdminStore>(
    `/stores/${encodeURIComponent(storeId)}/staff/${encodeURIComponent(staffUserId)}`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
}

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  customerId: string;
  vendorId: string;
  storeId: string;
  currencyCode: string;
  totalMinor: number;
  paymentMethod: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminPaymentRow = {
  id: string;
  orderId: string;
  vendorId: string;
  storeId: string;
  customerId: string | null;
  paymentMethod: string;
  provider: string;
  status: string;
  amountMinor: number;
  currencyCode: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  status: string;
  roles: string[];
};

export type AdminInventoryItemRow = {
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

export function listAdminOrders(token: string, limit = 50): Promise<AdminOrderRow[]> {
  return apiRequest<AdminOrderRow[]>(`/admin/orders?limit=${limit}`, {
    headers: authHeaders(token),
  });
}

export function listAdminPayments(token: string, limit = 50): Promise<AdminPaymentRow[]> {
  return apiRequest<AdminPaymentRow[]>(`/admin/payments?limit=${limit}`, {
    headers: authHeaders(token),
  });
}

export type AdminPaymentGatewayStatus = {
  mode: string;
  sslcommerz: { configured: boolean; sandbox: boolean };
  bkash: { configured: boolean; sandbox: boolean };
  nagad: { configured: boolean; sandbox: boolean };
};

export function getAdminPaymentGateways(token: string): Promise<AdminPaymentGatewayStatus> {
  return apiRequest<AdminPaymentGatewayStatus>('/admin/payments/gateways', {
    headers: authHeaders(token),
  });
}

export function listAdminUsers(token: string, limit = 50): Promise<AdminUserRow[]> {
  return apiRequest<AdminUserRow[]>(`/admin/users?limit=${limit}`, {
    headers: authHeaders(token),
  });
}

export function listAdminInventoryItems(
  token: string,
  storeId: string,
  limit = 50,
): Promise<AdminInventoryItemRow[]> {
  return apiRequest<AdminInventoryItemRow[]>(
    `/inventory/stores/${encodeURIComponent(storeId)}/items?limit=${limit}`,
    { headers: authHeaders(token) },
  );
}

export type AdminStoreOfferRow = {
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

export function listAdminStoreOffers(
  token: string,
  storeId: string,
): Promise<AdminStoreOfferRow[]> {
  const qs = new URLSearchParams({ storeId });
  return apiRequest<AdminStoreOfferRow[]>(`/store-offers?${qs.toString()}`, {
    headers: authHeaders(token),
  });
}

export type AdminWarehouseRow = {
  id: string;
  vendorId: string;
  storeId: string;
  code: string;
  name: string;
  status: string;
  addressLine: string | null;
};

export function listAdminStoreWarehouses(
  token: string,
  storeId: string,
): Promise<AdminWarehouseRow[]> {
  return apiRequest<AdminWarehouseRow[]>(
    `/inventory/stores/${encodeURIComponent(storeId)}/warehouses`,
    { headers: authHeaders(token) },
  );
}

export function listAdminStoreOrders(token: string, storeId: string): Promise<AdminOrderRow[]> {
  return apiRequest<AdminOrderRow[]>(`/orders/stores/${encodeURIComponent(storeId)}`, {
    headers: authHeaders(token),
  });
}

export type AdminAuditEvent = {
  id: string;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  vendorId: string | null;
  storeId: string | null;
  requestId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminAuditFilterOptions = {
  limit?: number;
  offset?: number;
  actionPrefix?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  vendorId?: string;
  storeId?: string;
  actorUserId?: string;
  fromDate?: string;
  toDate?: string;
};

export type AdminAuditQueryResult = {
  items: AdminAuditEvent[];
  total: number;
  limit: number;
  offset: number;
};

export function listAdminAuditEvents(
  token: string,
  options?: AdminAuditFilterOptions,
): Promise<AdminAuditEvent[]> {
  const params = new URLSearchParams();
  params.set('limit', String(options?.limit ?? 50));
  if (options?.offset !== undefined) params.set('offset', String(options.offset));
  if (options?.actionPrefix) params.set('actionPrefix', options.actionPrefix);
  if (options?.action) params.set('action', options.action);
  if (options?.resourceType) params.set('resourceType', options.resourceType);
  if (options?.resourceId) params.set('resourceId', options.resourceId);
  if (options?.vendorId) params.set('vendorId', options.vendorId);
  if (options?.storeId) params.set('storeId', options.storeId);
  if (options?.actorUserId) params.set('actorUserId', options.actorUserId);
  if (options?.fromDate) params.set('fromDate', options.fromDate);
  if (options?.toDate) params.set('toDate', options.toDate);
  return apiRequest<AdminAuditEvent[]>(`/admin/audit/events?${params.toString()}`, {
    headers: authHeaders(token),
  });
}

export function queryAdminAuditEvents(
  token: string,
  options?: AdminAuditFilterOptions,
): Promise<AdminAuditQueryResult> {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) params.set('offset', String(options.offset));
  if (options?.actionPrefix) params.set('actionPrefix', options.actionPrefix);
  if (options?.action) params.set('action', options.action);
  if (options?.resourceType) params.set('resourceType', options.resourceType);
  if (options?.resourceId) params.set('resourceId', options.resourceId);
  if (options?.vendorId) params.set('vendorId', options.vendorId);
  if (options?.storeId) params.set('storeId', options.storeId);
  if (options?.actorUserId) params.set('actorUserId', options.actorUserId);
  if (options?.fromDate) params.set('fromDate', options.fromDate);
  if (options?.toDate) params.set('toDate', options.toDate);
  return apiRequest<AdminAuditQueryResult>(`/admin/audit/query?${params.toString()}`, {
    headers: authHeaders(token),
  });
}

export function getAdminStoreActivity(
  token: string,
  storeId: string,
  options?: { limit?: number; offset?: number },
): Promise<AdminAuditQueryResult> {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) params.set('offset', String(options.offset));
  return apiRequest<AdminAuditQueryResult>(
    `/admin/audit/stores/${encodeURIComponent(storeId)}?${params.toString()}`,
    {
      headers: authHeaders(token),
    },
  );
}

export type AdminOrderReportCurrency = {
  currencyCode: string;
  orderCount: number;
  paidOrderCount: number;
  revenueMinor: number;
  commissionMinor: number;
};

export type AdminOrderReportSummary = {
  currencies: AdminOrderReportCurrency[];
  orderCount: number;
  paidOrderCount: number;
};

export function getAdminOrderReportSummary(token: string): Promise<AdminOrderReportSummary> {
  return apiRequest<AdminOrderReportSummary>('/admin/reports/orders/summary', {
    headers: authHeaders(token),
  });
}

export type AdminVendorPerformanceRow = {
  vendorId: string;
  currencies: AdminOrderReportCurrency[];
  orderCount: number;
  paidOrderCount: number;
  revenueMinor: number;
  commissionMinor: number;
};

export type AdminStorePerformanceRow = {
  storeId: string;
  vendorId: string;
  currencies: AdminOrderReportCurrency[];
  orderCount: number;
  paidOrderCount: number;
  revenueMinor: number;
  commissionMinor: number;
};

export function getAdminVendorReportSummary(token: string): Promise<AdminVendorPerformanceRow[]> {
  return apiRequest<AdminVendorPerformanceRow[]>('/admin/reports/vendors/summary', {
    headers: authHeaders(token),
  });
}

export function getAdminStoreReportSummary(token: string): Promise<AdminStorePerformanceRow[]> {
  return apiRequest<AdminStorePerformanceRow[]>('/admin/reports/stores/summary', {
    headers: authHeaders(token),
  });
}

export type AdminTrendDataPoint = {
  date: string;
  orderCount: number;
  paidOrderCount: number;
  revenueMinor: number;
  commissionMinor: number;
  aovMinor: number;
};

export type AdminPaymentMethodSummary = {
  paymentMethod: string;
  orderCount: number;
  paidOrderCount: number;
  revenueMinor: number;
};

export type AdminSalesAnalytics = {
  summary: AdminOrderReportSummary;
  aovMinor: number;
  trends: AdminTrendDataPoint[];
  paymentMethods: AdminPaymentMethodSummary[];
};

export type AdminScopedAnalyticsSummary = {
  scopeId: string;
  scopeType: 'VENDOR' | 'STORE';
  currencies: AdminOrderReportCurrency[];
  orderCount: number;
  paidOrderCount: number;
  revenueMinor: number;
  commissionMinor: number;
  aovMinor: number;
  trends: AdminTrendDataPoint[];
  paymentMethods: AdminPaymentMethodSummary[];
};

export function getAdminSalesTrends(token: string, days = 30): Promise<AdminSalesAnalytics> {
  return apiRequest<AdminSalesAnalytics>(`/admin/reports/sales/trends?days=${days}`, {
    headers: authHeaders(token),
  });
}

export function getStoreAnalyticsOverview(
  token: string,
  storeId: string,
  days = 30,
): Promise<AdminScopedAnalyticsSummary> {
  return apiRequest<AdminScopedAnalyticsSummary>(
    `/reports/stores/${storeId}/overview?days=${days}`,
    {
      headers: authHeaders(token),
    },
  );
}

export function getVendorAnalyticsOverview(
  token: string,
  vendorId: string,
  days = 30,
): Promise<AdminScopedAnalyticsSummary> {
  return apiRequest<AdminScopedAnalyticsSummary>(
    `/reports/vendors/${vendorId}/overview?days=${days}`,
    {
      headers: authHeaders(token),
    },
  );
}

export type AdminProductPerformanceRow = {
  productId: string;
  variantId: string;
  unitsSold: number;
  orderCount: number;
  revenueMinor: number;
  currencyCode: string;
};

export type AdminRefundReportSummary = {
  totalRefundCount: number;
  totalRefundedMinor: number;
  primaryCurrency: string;
  refundRatePercent: number;
  refundsByMethod: {
    paymentMethod: string;
    refundCount: number;
    amountMinor: number;
  }[];
  recentRefunds: {
    refundId: string;
    orderId: string;
    vendorId: string;
    storeId: string;
    amountMinor: number;
    currencyCode: string;
    paymentMethod: string | null;
    createdAt: string;
  }[];
};

export function getAdminTopProducts(
  token: string,
  days = 30,
  limit = 10,
): Promise<AdminProductPerformanceRow[]> {
  return apiRequest<AdminProductPerformanceRow[]>(
    `/admin/reports/products/top?days=${days}&limit=${limit}`,
    {
      headers: authHeaders(token),
    },
  );
}

export function getAdminRefundSummary(token: string, days = 30): Promise<AdminRefundReportSummary> {
  return apiRequest<AdminRefundReportSummary>(`/admin/reports/refunds/summary?days=${days}`, {
    headers: authHeaders(token),
  });
}

export type SystemDependencyPing = {
  name: string;
  status: 'up' | 'down' | 'disabled';
  latencyMs: number;
  host?: string | null;
  error?: string | null;
};

export type SystemQueueSnapshot = {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  lagMs: number;
  status: 'healthy' | 'degraded' | 'critical';
};

export type SystemHealthDiagnostics = {
  status: 'healthy' | 'degraded';
  timestamp: string;
  process: {
    uptimeSec: number;
    pid: number;
    nodeVersion: string;
    platform: string;
    memory: {
      heapUsedBytes: number;
      heapTotalBytes: number;
      rssBytes: number;
      heapUsedMb: number;
      heapTotalMb: number;
      rssMb: number;
    };
  };
  dependencies: {
    database: SystemDependencyPing;
    redis: SystemDependencyPing;
    meilisearch: SystemDependencyPing;
  };
  workers: {
    summary: {
      totalQueues: number;
      totalWaiting: number;
      totalActive: number;
      totalFailed: number;
      totalDelayed: number;
    };
    queues: SystemQueueSnapshot[];
  };
};

export type SystemHealthProbe = {
  status: string;
  uptimeSec?: number;
  timestamp?: string;
  pid?: number;
  info?: Record<string, unknown>;
  error?: Record<string, unknown>;
  details?: Record<string, unknown>;
};

export function getSystemHealthDiagnostics(token?: string): Promise<SystemHealthDiagnostics> {
  return apiRequest<SystemHealthDiagnostics>('/health/diagnostics', {
    headers: token ? authHeaders(token) : {},
  });
}

export function getSystemHealthLive(): Promise<{ status: string; uptimeSec: number }> {
  return apiRequest<{ status: string; uptimeSec: number }>('/health/live');
}

export function getSystemHealthReady(): Promise<SystemHealthProbe> {
  return apiRequest<SystemHealthProbe>('/health/ready');
}

export function getSystemWorkerMetrics(token?: string): Promise<{
  timestamp: string;
  summary: {
    totalQueues: number;
    totalWaiting: number;
    totalActive: number;
    totalFailed: number;
    totalDelayed: number;
  };
  queues: SystemQueueSnapshot[];
}> {
  return apiRequest<{
    timestamp: string;
    summary: {
      totalQueues: number;
      totalWaiting: number;
      totalActive: number;
      totalFailed: number;
      totalDelayed: number;
    };
    queues: SystemQueueSnapshot[];
  }>('/health/workers', {
    headers: token ? authHeaders(token) : {},
  });
}
