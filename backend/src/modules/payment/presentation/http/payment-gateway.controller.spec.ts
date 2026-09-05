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

    expect(res).toBeDefined();
    expect(res?.success).toBe(true);
    expect(res?.status).toBe('CAPTURED');
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

    expect(res).toBeDefined();
    expect(res?.success).toBe(true);
    expect(mockHandler.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'BKASH',
        paymentIntentId: 'intent-bkash',
      }),
    );
  });

  it('unpacks bkash SNS Notification payload', async () => {
    const req = { ip: '127.0.0.1' } as never;
    const body = {
      Type: 'Notification',
      Message: JSON.stringify({
        trxID: '4J420ANOXC',
        transactionStatus: 'Completed',
        amount: '100',
        currency: 'BDT',
        merchantInvoiceNumber: 'intent-sns-bkash',
      }),
    };
    const res = await controller.handleBkashCallback(req, body, {});

    expect(res).toBeDefined();
    expect(res?.success).toBe(true);
    expect(mockHandler.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'BKASH',
        paymentIntentId: 'intent-sns-bkash',
      }),
    );
  });

  it('routes nagad callback correctly', async () => {
    const req = { ip: '127.0.0.1' } as never;
    const query = { paymentIntentId: 'intent-nagad' };
    const body = { payment_ref_id: 'NAGAD_111', status: 'Success' };
    const res = await controller.handleNagadCallback(req, body, query);

    expect(res).toBeDefined();
    expect(res?.success).toBe(true);
    expect(mockHandler.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'NAGAD',
        paymentIntentId: 'intent-nagad',
      }),
    );
  });

  it('redirects browser to storefront receipt page when accept header includes text/html', async () => {
    const req = {
      ip: '127.0.0.1',
      headers: { accept: 'text/html,application/xhtml+xml' },
    } as never;
    const resMock = { redirect: vi.fn() };
    const query = { paymentIntentId: 'intent-ssl' };
    const body = { tran_id: 'intent-ssl', status: 'VALID', val_id: 'val-1' };

    await controller.handleSslCommerzCallback(req, body, query, resMock as never);

    expect(resMock.redirect).toHaveBeenCalledWith(
      303,
      expect.stringContaining('/checkout/receipt?status=CAPTURED&orderId=order-1'),
    );
  });
});
