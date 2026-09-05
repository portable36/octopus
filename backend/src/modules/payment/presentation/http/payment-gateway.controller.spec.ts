import { describe, expect, it, vi } from 'vitest';
import { PaymentGatewayController } from './payment-gateway.controller';

describe('PaymentGatewayController', () => {
  const mockHandler = {
    execute: vi.fn(async (input) => ({
      success: true,
      paymentIntentId: input.paymentIntentId || 'intent-1',
      orderId: 'order-1',
      status: 'CAPTURED',
      providerTransactionId: 'TRX_123',
    })),
  };

  const controller = new PaymentGatewayController(mockHandler as never, undefined);

  it('routes sslcommerz callback correctly', async () => {
    const req = { ip: '127.0.0.1' } as never;
    const body = { tran_id: 'intent-ssl', val_id: 'val-1', status: 'VALID' };
    const res = await controller.handleSslCommerzCallback(req, body, {});

    expect(res.success).toBe(true);
    expect(res.status).toBe('CAPTURED');
    expect(mockHandler.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'SSLCOMMERZ',
        paymentIntentId: 'intent-ssl',
      }),
    );
  });

  it('routes sslcommerz ipn correctly', async () => {
    const req = { ip: '127.0.0.1' } as never;
    const body = { tran_id: 'intent-ipn', val_id: 'val-2', status: 'VALID' };
    const res = await controller.handleSslCommerzIpn(req, body, {});

    expect(res.received).toBe(true);
    expect(res.status).toBe('CAPTURED');
  });

  it('routes bkash callback correctly', async () => {
    const req = { ip: '127.0.0.1' } as never;
    const query = { paymentIntentId: 'intent-bkash' };
    const body = { paymentID: 'PID_999', status: 'success' };
    const res = await controller.handleBkashCallback(req, body, query);

    expect(res.success).toBe(true);
    expect(mockHandler.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'BKASH',
        paymentIntentId: 'intent-bkash',
      }),
    );
  });

  it('routes nagad callback correctly', async () => {
    const req = { ip: '127.0.0.1' } as never;
    const query = { paymentIntentId: 'intent-nagad' };
    const body = { payment_ref_id: 'NAGAD_111', status: 'Success' };
    const res = await controller.handleNagadCallback(req, body, query);

    expect(res.success).toBe(true);
    expect(mockHandler.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'NAGAD',
        paymentIntentId: 'intent-nagad',
      }),
    );
  });
});
