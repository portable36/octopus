import { describe, expect, it, vi, afterEach } from 'vitest';
import { PaymentIntent } from '../../domain/aggregates/payment-intent.aggregate';
import { SslCommerzGatewayAdapter } from './sslcommerz-gateway.adapter';
import { BkashGatewayAdapter } from './bkash-gateway.adapter';
import { NagadGatewayAdapter } from './nagad-gateway.adapter';

function createMockAppConfig(
  mode: 'sandbox-mock' | 'live' = 'sandbox-mock',
  options?: { isProduction?: boolean },
) {
  return {
    paymentGatewayMode: mode,
    isProduction: options?.isProduction ?? false,
    port: 3000,
    sslCommerzStoreId: mode === 'live' ? 'store_live' : undefined,
    sslCommerzStorePasswd: mode === 'live' ? 'passwd_live' : undefined,
    sslCommerzIsSandbox: true,
    bkashAppKey: mode === 'live' ? 'app_key_live' : undefined,
    bkashAppSecret: mode === 'live' ? 'app_secret_live' : undefined,
    bkashUsername: mode === 'live' ? 'username_live' : undefined,
    bkashPassword: mode === 'live' ? 'password_live' : undefined,
    bkashIsSandbox: true,
    nagadMerchantId: mode === 'live' ? 'merchant_live' : undefined,
    nagadMerchantPrivateKey: mode === 'live' ? 'priv_key' : undefined,
    nagadPgPublicKey: mode === 'live' ? 'pub_key' : undefined,
    nagadIsSandbox: true,
  } as never;
}

function createTestIntent(method: 'SSLCOMMERZ' | 'BKASH' | 'NAGAD', amountMinor = 150000) {
  return PaymentIntent.create({
    checkoutId: 'c1d88bb4-0000-4000-8000-000000000001',
    orderId: 'c1d88bb4-0000-4000-8000-000000000002',
    vendorId: 'c1d88bb4-0000-4000-8000-000000000003',
    storeId: 'c1d88bb4-0000-4000-8000-000000000004',
    customerId: 'c1d88bb4-0000-4000-8000-000000000005',
    paymentMethod: method,
    amountMinor,
    currencyCode: 'BDT',
  });
}

describe('Payment Gateway Adapters (Dual-Mode Simulation)', () => {
  describe('SslCommerzGatewayAdapter', () => {
    const config = createMockAppConfig('sandbox-mock');
    const adapter = new SslCommerzGatewayAdapter(config);

    it('initializes simulated session with valid redirect URL', async () => {
      const intent = createTestIntent('SSLCOMMERZ', 250000);
      const res = await adapter.initializeSession({ paymentIntent: intent });

      expect(res.redirectUrl).toContain('https://sandbox.sslcommerz.com/gwprocess/v4/simulator');
      expect(res.redirectUrl).toContain(`tran_id=${intent.id.value}`);
      expect(res.redirectUrl).toContain('amount=2500.00');
      expect(res.gatewayReferenceId).toBeDefined();
    });

    it('verifies simulated payment payload as valid', async () => {
      const intent = createTestIntent('SSLCOMMERZ', 250000);
      const res = await adapter.verifyPayment({
        paymentIntent: intent,
        payload: { val_id: 'val_123', status: 'VALID', bank_tran_id: 'SSL_BANK_123' },
      });

      expect(res.isSuccess).toBe(true);
      expect(res.providerTransactionId).toBe('SSL_BANK_123');
      expect(res.amountMinor).toBe(250000);
      expect(res.currencyCode).toBe('BDT');
    });

    it('handles cancellation status gracefully', async () => {
      const intent = createTestIntent('SSLCOMMERZ', 250000);
      const res = await adapter.verifyPayment({
        paymentIntent: intent,
        payload: { status: 'CANCEL', tran_id: intent.id.value },
      });

      expect(res.isSuccess).toBe(false);
      expect(res.isCancelled).toBe(true);
    });

    it('simulates gateway refund successfully', async () => {
      const intent = createTestIntent('SSLCOMMERZ', 250000);
      const res = await adapter.refund({
        paymentIntent: intent,
        refundId: 'ref_1',
        amountMinor: 50000,
        currencyCode: 'BDT',
        reason: 'Customer return',
      });

      expect(res.success).toBe(true);
      expect(res.providerRefundId).toContain('REF_SSL_');
    });
  });

  describe('BkashGatewayAdapter', () => {
    const config = createMockAppConfig('sandbox-mock');
    const adapter = new BkashGatewayAdapter(config);

    it('initializes simulated tokenized checkout session', async () => {
      const intent = createTestIntent('BKASH', 120000);
      const res = await adapter.initializeSession({ paymentIntent: intent });

      expect(res.redirectUrl).toContain('https://tokenized.sandbox.bka.sh/v1.2.0-beta/checkout');
      expect(res.gatewayReferenceId).toContain('BKASH_PID_');
    });

    it('verifies simulated payment execution as completed', async () => {
      const intent = createTestIntent('BKASH', 120000);
      const res = await adapter.verifyPayment({
        paymentIntent: intent,
        payload: { trxID: 'TRX_BKASH_999', status: 'success' },
      });

      expect(res.isSuccess).toBe(true);
      expect(res.providerTransactionId).toBe('TRX_BKASH_999');
      expect(res.gatewayStatusCode).toBe('Completed');
    });

    it('identifies failed payment callback', async () => {
      const intent = createTestIntent('BKASH', 120000);
      const res = await adapter.verifyPayment({
        paymentIntent: intent,
        payload: { status: 'failure', statusMessage: 'Insufficient Balance' },
      });

      expect(res.isSuccess).toBe(false);
      expect(res.isFailed).toBe(true);
      expect(res.failureReason).toContain('Insufficient Balance');
    });

    it('simulates bKash refund', async () => {
      const intent = createTestIntent('BKASH', 120000);
      const res = await adapter.refund({
        paymentIntent: intent,
        refundId: 'ref_2',
        amountMinor: 30000,
        currencyCode: 'BDT',
      });

      expect(res.success).toBe(true);
      expect(res.providerRefundId).toContain('REF_BKASH_');
    });
  });

  describe('NagadGatewayAdapter', () => {
    const config = createMockAppConfig('sandbox-mock');
    const adapter = new NagadGatewayAdapter(config);

    it('initializes simulated checkout session', async () => {
      const intent = createTestIntent('NAGAD', 80000);
      const res = await adapter.initializeSession({ paymentIntent: intent });

      expect(res.redirectUrl).toContain('http://sandbox.mynagad.com:10080/check-out');
      expect(res.gatewayReferenceId).toContain('NAGAD_REF_');
    });

    it('verifies simulated payment as successful', async () => {
      const intent = createTestIntent('NAGAD', 80000);
      const res = await adapter.verifyPayment({
        paymentIntent: intent,
        payload: { payment_ref_id: 'NAGAD_REF_123', status: 'Success' },
      });

      expect(res.isSuccess).toBe(true);
      expect(res.providerTransactionId).toBe('NAGAD_REF_123');
      expect(res.gatewayStatusCode).toBe('Success');
    });

    it('identifies cancelled payment callback', async () => {
      const intent = createTestIntent('NAGAD', 80000);
      const res = await adapter.verifyPayment({
        paymentIntent: intent,
        payload: { status: 'cancel' },
      });

      expect(res.isSuccess).toBe(false);
      expect(res.isCancelled).toBe(true);
    });

    it('simulates Nagad refund', async () => {
      const intent = createTestIntent('NAGAD', 80000);
      const res = await adapter.refund({
        paymentIntent: intent,
        refundId: 'ref_3',
        amountMinor: 20000,
        currencyCode: 'BDT',
      });

      expect(res.success).toBe(true);
      expect(res.providerRefundId).toContain('REF_NAGAD_');
    });
  });
});

describe('Payment Gateway Adapters (credentialed HTTP path, mocked fetch)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('SslCommerz posts to sandbox session API when credentials are set', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        status: 'SUCCESS',
        GatewayPageURL: 'https://sandbox.sslcommerz.com/EasyCheckOut/testcheckout',
        sessionkey: 'sess_live_path',
      }),
      text: async (): Promise<string> => '',
    }));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new SslCommerzGatewayAdapter(createMockAppConfig('live'));
    const intent = createTestIntent('SSLCOMMERZ', 150000);
    const res = await adapter.initializeSession({ paymentIntent: intent });

    expect(res.redirectUrl).toBe('https://sandbox.sslcommerz.com/EasyCheckOut/testcheckout');
    expect(res.gatewayReferenceId).toBe('sess_live_path');
    expect(fetchMock).toHaveBeenCalledOnce();
    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    const [url, init] = firstCall as unknown as [string, RequestInit];
    expect(url).toBe('https://sandbox.sslcommerz.com/gwprocess/v4/api.php');
    expect(String(init.body)).toContain('store_id=store_live');
    expect(String(init.body)).toContain('total_amount=1500.00');
  });

  it('bKash requests token then create checkout when credentials are set', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('/token/grant')) {
        return {
          ok: true,
          json: async () => ({ id_token: 'bkash_token_test', expires_in: 3600 }),
          text: async (): Promise<string> => '',
        };
      }
      return {
        ok: true,
        json: async () => ({
          bkashURL: 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/checkout?paymentID=pid_live',
          paymentID: 'pid_live',
        }),
        text: async (): Promise<string> => '',
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new BkashGatewayAdapter(createMockAppConfig('live'));
    const intent = createTestIntent('BKASH', 9900);
    const res = await adapter.initializeSession({ paymentIntent: intent });

    expect(res.redirectUrl).toContain('paymentID=pid_live');
    expect(res.gatewayReferenceId).toBe('pid_live');
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/token/grant');
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/tokenized/checkout/create');
  });

  it('refuses SSLCommerz mock verify in production', async () => {
    const adapter = new SslCommerzGatewayAdapter(
      createMockAppConfig('sandbox-mock', { isProduction: true }),
    );
    const intent = createTestIntent('SSLCOMMERZ', 1000);
    await expect(
      adapter.verifyPayment({
        paymentIntent: intent,
        payload: { status: 'VALID', bank_tran_id: 'forge' },
      }),
    ).rejects.toThrow(/forbidden in production/i);
  });
});
