import { apiRequest } from '@/lib/api-client';
import { getAccessToken } from '@/lib/auth-session';
import { guestHeaders } from '@/lib/guest-token';

function cartHeaders(extra?: HeadersInit): Headers {
  const headers = guestHeaders(extra);
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

export type CartLine = {
  lineId: string;
  vendorId: string;
  storeId: string;
  productId: string;
  variantId: string;
  offerId: string;
  quantity: number;
  unitPriceSnapshotMinor: number;
  currencyCode: string;
};

export type CartResponse = {
  id: string;
  customerId: string | null;
  guestToken: string | null;
  currencyCode: string;
  status: string;
  version: number;
  lines: readonly CartLine[];
  updatedAt: string;
};

export type CheckoutOutcome = {
  checkoutId: string;
  cartId: string;
  cartVersion: number;
  status: 'COMPLETED';
  paymentMethod: string;
  totals: {
    subtotalMinor: number;
    discountMinor: number;
    shippingMinor: number;
    taxMinor: number;
    commissionMinor: number;
    grandTotalMinor: number;
    currencyCode: string;
  };
  orders: readonly {
    orderId: string;
    orderNumber: string;
    vendorId: string;
    storeId: string;
    totalMinor: number;
    currencyCode: string;
    paymentMethod: string;
    paymentStatus: string;
  }[];
  payments: readonly {
    paymentIntentId: string;
    orderId: string;
    paymentMethod: string;
    amountMinor: number;
    currencyCode: string;
    status: string;
  }[];
};

export type ShippingAddressInput = {
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  countryCode: string;
};

export async function getOrCreateCart(): Promise<CartResponse> {
  return apiRequest<CartResponse>('/cart', {
    method: 'POST',
    headers: cartHeaders(),
  });
}

export async function fetchCart(cartId: string): Promise<CartResponse> {
  return apiRequest<CartResponse>(`/cart/${encodeURIComponent(cartId)}`, {
    headers: cartHeaders(),
  });
}

export async function addCartItem(input: {
  cartId: string;
  storeId: string;
  variantId: string;
  quantity: number;
}): Promise<CartResponse> {
  return apiRequest<CartResponse>(`/cart/${encodeURIComponent(input.cartId)}/items`, {
    method: 'POST',
    headers: cartHeaders(),
    body: {
      storeId: input.storeId,
      variantId: input.variantId,
      quantity: input.quantity,
    },
  });
}

export async function updateCartLineQuantity(input: {
  cartId: string;
  lineId: string;
  quantity: number;
}): Promise<CartResponse> {
  return apiRequest<CartResponse>(
    `/cart/${encodeURIComponent(input.cartId)}/items/${encodeURIComponent(input.lineId)}`,
    {
      method: 'PATCH',
      headers: cartHeaders(),
      body: { quantity: input.quantity },
    },
  );
}

export async function removeCartLine(input: {
  cartId: string;
  lineId: string;
}): Promise<CartResponse> {
  return apiRequest<CartResponse>(
    `/cart/${encodeURIComponent(input.cartId)}/items/${encodeURIComponent(input.lineId)}`,
    {
      method: 'DELETE',
      headers: cartHeaders(),
    },
  );
}

export async function submitCheckout(input: {
  cartId: string;
  expectedCartVersion: number;
  idempotencyKey: string;
  paymentMethod: 'COD';
  shippingAddress: ShippingAddressInput;
  shippingMethod: string;
  attribution?: {
    landingPath?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    gclid?: string;
    fbclid?: string;
    firstTouchAt?: string;
    lastTouchAt?: string;
  };
}): Promise<CheckoutOutcome> {
  return apiRequest<CheckoutOutcome>('/checkout/submit', {
    method: 'POST',
    headers: cartHeaders({
      'idempotency-key': input.idempotencyKey,
    }),
    body: {
      cartId: input.cartId,
      expectedCartVersion: input.expectedCartVersion,
      idempotencyKey: input.idempotencyKey,
      paymentMethod: input.paymentMethod,
      shippingAddress: input.shippingAddress,
      shippingMethod: input.shippingMethod,
      ...(input.attribution ? { attribution: input.attribution } : {}),
    },
  });
}

const CHECKOUT_OUTCOME_KEY = 'octopus.checkoutOutcome';

export function stashCheckoutOutcome(outcome: CheckoutOutcome): void {
  window.sessionStorage.setItem(CHECKOUT_OUTCOME_KEY, JSON.stringify(outcome));
}

export function readStashedCheckoutOutcome(): CheckoutOutcome | null {
  const raw = window.sessionStorage.getItem(CHECKOUT_OUTCOME_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as CheckoutOutcome;
  } catch {
    return null;
  }
}
