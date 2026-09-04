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

export function listAdminAuditEvents(
  token: string,
  options?: { limit?: number; actionPrefix?: string },
): Promise<AdminAuditEvent[]> {
  const params = new URLSearchParams();
  params.set('limit', String(options?.limit ?? 50));
  if (options?.actionPrefix) {
    params.set('actionPrefix', options.actionPrefix);
  }
  return apiRequest<AdminAuditEvent[]>(`/admin/audit/events?${params.toString()}`, {
    headers: authHeaders(token),
  });
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
