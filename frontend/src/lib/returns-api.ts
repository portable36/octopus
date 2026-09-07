import { apiRequest } from '@/lib/api-client';

export interface ReturnReasonOption {
  readonly code: string;
  readonly label: string;
  readonly requiresInspection: boolean;
  readonly customerSelectable: boolean;
  readonly active: boolean;
}

export interface ReturnLookupLine {
  readonly orderItemId: string;
  readonly productId: string;
  readonly variantId: string;
  readonly productName: string;
  readonly unitPriceMinor: number;
  readonly quantity: number;
  readonly fulfilledQuantity: number;
  readonly alreadyReturnedQuantity: number;
  readonly returnableQuantity: number;
}

export interface ExistingReturnSummary {
  readonly returnId: string;
  readonly status: string;
  readonly requestedAt: string;
  readonly itemCount: number;
  readonly totalQuantity: number;
}

export interface PublicOrderReturnLookupResponse {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly customerId: string | null;
  readonly customerEmail: string | null;
  readonly status: string;
  readonly paymentStatus: string;
  readonly fulfillmentStatus: string;
  readonly currencyCode: string;
  readonly totalMinor: number;
  readonly orderDate: string;
  readonly returnEligible: boolean;
  readonly returnIneligibleReason: string | null;
  readonly returnWindowDays: number;
  readonly daysRemainingInReturnWindow: number;
  readonly lines: readonly ReturnLookupLine[];
  readonly existingReturns: readonly ExistingReturnSummary[];
}

export interface ReturnTimelineMilestone {
  readonly key: string;
  readonly label: string;
  readonly state: 'COMPLETED' | 'CURRENT' | 'UPCOMING' | 'REJECTED' | 'CANCELLED';
  readonly timestamp: string | null;
  readonly description: string;
}

export interface ReturnTimelineItem {
  readonly orderItemId: string;
  readonly productId: string;
  readonly variantId: string;
  readonly sku: string;
  readonly productName: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
  readonly lineTotalMinor: number;
  readonly reasonCode: string;
  readonly reasonLabel: string;
}

export interface ReturnTimelineInspection {
  readonly condition: string;
  readonly quantityReceived: number;
  readonly quantityAccepted: number;
  readonly quantityRejected: number;
  readonly inspectedAt: string;
  readonly note: string | null;
  readonly reason: string | null;
}

export interface ReturnTimelineResponse {
  readonly id: string;
  readonly orderId: string;
  readonly orderNumber: string;
  readonly status: string;
  readonly statusLabel: string;
  readonly statusDescription: string;
  readonly customerNote: string | null;
  readonly rejectionReasonCode: string | null;
  readonly rejectionNote: string | null;
  readonly canCancel: boolean;
  readonly requestedAt: string;
  readonly reviewedAt: string | null;
  readonly approvedAt: string | null;
  readonly receivedAt: string | null;
  readonly inspectedAt: string | null;
  readonly completedAt: string | null;
  readonly items: readonly ReturnTimelineItem[];
  readonly inspection: ReturnTimelineInspection | null;
  readonly milestones: readonly ReturnTimelineMilestone[];
}

export interface SubmitPublicReturnInput {
  readonly orderNumber: string;
  readonly email: string;
  readonly note?: string;
  readonly idempotencyKey: string;
  readonly items: readonly {
    readonly orderItemId: string;
    readonly quantity: number;
    readonly reasonCode: string;
  }[];
}

export async function fetchReturnReasons(): Promise<ReturnReasonOption[]> {
  return apiRequest<ReturnReasonOption[]>('/returns/reasons', {
    method: 'GET',
  });
}

export async function lookupOrderForReturn(input: {
  orderNumber: string;
  email: string;
}): Promise<PublicOrderReturnLookupResponse> {
  return apiRequest<PublicOrderReturnLookupResponse>('/returns/public/lookup', {
    method: 'POST',
    body: {
      orderNumber: input.orderNumber.trim(),
      email: input.email.trim(),
    },
  });
}

export async function submitPublicReturn(
  input: SubmitPublicReturnInput,
): Promise<ReturnTimelineResponse> {
  return apiRequest<ReturnTimelineResponse>('/returns/public/request', {
    method: 'POST',
    headers: {
      'Idempotency-Key': input.idempotencyKey,
    },
    body: {
      orderNumber: input.orderNumber.trim(),
      email: input.email.trim(),
      ...(input.note !== undefined && input.note.trim() ? { note: input.note.trim() } : {}),
      items: input.items,
    },
  });
}

export async function getPublicReturnTimeline(
  returnId: string,
  query?: { orderNumber?: string; email?: string },
): Promise<ReturnTimelineResponse> {
  const params = new URLSearchParams();
  if (query?.orderNumber) params.set('orderNumber', query.orderNumber);
  if (query?.email) params.set('email', query.email);
  const qs = params.toString();
  const path = `/returns/public/${encodeURIComponent(returnId)}${qs ? `?${qs}` : ''}`;

  return apiRequest<ReturnTimelineResponse>(path, {
    method: 'GET',
  });
}

export async function cancelPublicReturn(
  returnId: string,
  body?: { orderNumber?: string; email?: string },
): Promise<ReturnTimelineResponse> {
  return apiRequest<ReturnTimelineResponse>(
    `/returns/public/${encodeURIComponent(returnId)}/cancel`,
    {
      method: 'POST',
      body: body ?? {},
    },
  );
}
