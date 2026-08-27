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
  status: string;
  profile: { displayName: string; slug: string; description?: string | null };
  address?: Record<string, unknown> | null;
  settings?: AdminCommerceSettings;
  staff: AdminStaffMember[];
};

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function listAdminVendors(token: string): Promise<AdminVendor[]> {
  return apiRequest<AdminVendor[]>('/admin/vendors', { headers: authHeaders(token) });
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

export function listAdminStores(token: string): Promise<AdminStore[]> {
  return apiRequest<AdminStore[]>('/admin/stores', { headers: authHeaders(token) });
}

export function getAdminStore(token: string, storeId: string): Promise<AdminStore> {
  return apiRequest<AdminStore>(`/admin/stores/${encodeURIComponent(storeId)}`, {
    headers: authHeaders(token),
  });
}

export function activateStore(token: string, storeId: string): Promise<AdminStore> {
  return apiRequest<AdminStore>(`/stores/${encodeURIComponent(storeId)}/activate`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export function suspendStore(token: string, storeId: string, reason?: string): Promise<AdminStore> {
  return apiRequest<AdminStore>(`/stores/${encodeURIComponent(storeId)}/suspend`, {
    method: 'POST',
    headers: authHeaders(token),
    body: reason !== undefined && reason !== '' ? { reason } : {},
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
