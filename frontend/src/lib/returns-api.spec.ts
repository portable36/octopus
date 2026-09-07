import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cancelPublicReturn,
  fetchReturnReasons,
  getPublicReturnTimeline,
  lookupOrderForReturn,
  submitPublicReturn,
} from './returns-api';

describe('returns-api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches return reasons from API', async () => {
    const reasons = [
      {
        code: 'DEFECTIVE',
        label: 'Defective',
        requiresInspection: true,
        customerSelectable: true,
        active: true,
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => reasons,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchReturnReasons();
    expect(result).toEqual(reasons);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/returns/reasons'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('looks up order eligibility for return', async () => {
    const lookupResponse = {
      orderId: 'ord-123',
      orderNumber: 'ORD-123',
      returnEligible: true,
      lines: [],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => lookupResponse,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await lookupOrderForReturn({
      orderNumber: 'ORD-123',
      email: 'customer@test.com',
    });

    expect(result.orderNumber).toBe('ORD-123');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/returns/public/lookup'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ orderNumber: 'ORD-123', email: 'customer@test.com' }),
      }),
    );
  });

  it('submits a public return request with idempotency header', async () => {
    const timelineResponse = {
      id: 'ret-1',
      orderId: 'ord-123',
      status: 'REQUESTED',
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => timelineResponse,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await submitPublicReturn({
      orderNumber: 'ORD-123',
      email: 'customer@test.com',
      note: 'Item cracked',
      idempotencyKey: 'idem-key-7777',
      items: [{ orderItemId: 'item-1', quantity: 1, reasonCode: 'DAMAGED' }],
    });

    expect(result.id).toBe('ret-1');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/returns/public/request'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
      }),
    );
  });

  it('fetches return timeline and handles cancellation', async () => {
    const timeline = { id: 'ret-1', status: 'REQUESTED' };
    const cancelled = { id: 'ret-1', status: 'CANCELLED' };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => timeline,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => cancelled,
      });
    vi.stubGlobal('fetch', fetchMock);

    const t = await getPublicReturnTimeline('ret-1', {
      orderNumber: 'ORD-123',
      email: 'customer@test.com',
    });
    expect(t.status).toBe('REQUESTED');

    const c = await cancelPublicReturn('ret-1', {
      orderNumber: 'ORD-123',
      email: 'customer@test.com',
    });
    expect(c.status).toBe('CANCELLED');
  });
});
