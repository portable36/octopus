import { authedRequest } from '@/lib/auth-api';

export type CustomerProfile = {
  userId: string;
  displayName: string;
  phone: string | null;
  updatedAt: string;
};

export type CustomerAddress = {
  id: string;
  label: string;
  recipientName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
  isDefault: boolean;
  updatedAt: string;
};

export type OrderSummary = {
  id: string;
  orderNumber: string;
  storeId: string;
  currencyCode: string;
  totalMinor: number;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  paymentMethod: string;
  createdAt: string;
  lines: readonly {
    lineId: string;
    productId: string;
    variantId: string;
    quantity: number;
    lineTotalMinor: number;
    currencyCode: string;
  }[];
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    region?: string;
    postalCode?: string;
    countryCode: string;
  };
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
};

export type ReturnRecord = {
  id: string;
  orderId: string;
  status: string;
  customerNote: string | null;
  items: readonly unknown[];
  requestedAt: string;
};

export type ReturnReason = {
  code: string;
  label: string;
};

export async function fetchProfile(): Promise<CustomerProfile> {
  return authedRequest<CustomerProfile>('/customer/profile');
}

export async function updateProfile(input: {
  displayName?: string;
  phone?: string | null;
}): Promise<CustomerProfile> {
  return authedRequest<CustomerProfile>('/customer/profile', {
    method: 'PATCH',
    body: input,
  });
}

export async function listAddresses(): Promise<CustomerAddress[]> {
  return authedRequest<CustomerAddress[]>('/customer/addresses');
}

export async function addAddress(
  body: Omit<CustomerAddress, 'id' | 'updatedAt' | 'phone' | 'line2' | 'region' | 'postalCode'> & {
    phone?: string | null;
    line2?: string | null;
    region?: string | null;
    postalCode?: string | null;
  },
): Promise<CustomerAddress> {
  return authedRequest<CustomerAddress>('/customer/addresses', {
    method: 'POST',
    body,
  });
}

export async function deleteAddress(addressId: string): Promise<void> {
  await authedRequest(`/customer/addresses/${encodeURIComponent(addressId)}`, {
    method: 'DELETE',
  });
}

export async function listMyOrders(): Promise<OrderSummary[]> {
  return authedRequest<OrderSummary[]>('/orders/mine');
}

export async function fetchOrder(orderId: string): Promise<OrderSummary> {
  return authedRequest<OrderSummary>(`/orders/${encodeURIComponent(orderId)}`);
}

export async function requestOrderRefund(orderId: string): Promise<OrderSummary> {
  return authedRequest<OrderSummary>(`/orders/${encodeURIComponent(orderId)}/request-refund`, {
    method: 'POST',
  });
}

export async function listOrderReturns(orderId: string): Promise<ReturnRecord[]> {
  return authedRequest<ReturnRecord[]>(`/orders/${encodeURIComponent(orderId)}/returns`);
}

export async function listReturnReasons(): Promise<ReturnReason[]> {
  return authedRequest<ReturnReason[]>('/returns/reasons');
}

export async function requestReturn(input: {
  orderId: string;
  idempotencyKey: string;
  note?: string;
  items: { orderItemId: string; quantity: number; reasonCode: string }[];
}): Promise<ReturnRecord> {
  return authedRequest<ReturnRecord>(`/orders/${encodeURIComponent(input.orderId)}/returns`, {
    method: 'POST',
    headers: { 'Idempotency-Key': input.idempotencyKey },
    body: {
      items: input.items,
      ...(input.note ? { note: input.note } : {}),
    },
  });
}
