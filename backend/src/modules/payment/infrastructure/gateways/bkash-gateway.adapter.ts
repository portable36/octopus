import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../../config/app-config.service';
import type {
  GatewayRefundInput,
  GatewayRefundResult,
  GatewaySessionInitInput,
  GatewaySessionInitResult,
  GatewayVerificationInput,
  GatewayVerificationResult,
  PaymentGatewayPort,
} from '../../domain/ports/payment-gateway.port';

@Injectable()
export class BkashGatewayAdapter implements PaymentGatewayPort {
  private readonly logger = new Logger(BkashGatewayAdapter.name);
  public readonly provider = 'BKASH' as const;

  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(@Inject(AppConfigService) private readonly appConfig: AppConfigService) {}

  private isSimulated(): boolean {
    return (
      this.appConfig.paymentGatewayMode === 'sandbox-mock' ||
      !this.appConfig.bkashAppKey ||
      !this.appConfig.bkashAppSecret ||
      !this.appConfig.bkashUsername ||
      !this.appConfig.bkashPassword
    );
  }

  private getBaseUrl(): string {
    return this.appConfig.bkashIsSandbox
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta';
  }

  private async getIdToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.token;
    }

    const res = await fetch(`${this.getBaseUrl()}/tokenized/checkout/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        username: this.appConfig.bkashUsername!,
        password: this.appConfig.bkashPassword!,
      },
      body: JSON.stringify({
        app_key: this.appConfig.bkashAppKey,
        app_secret: this.appConfig.bkashAppSecret,
      }),
    });

    if (!res.ok) {
      throw new Error(`bKash token grant failed with HTTP ${res.status}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const token = typeof data.id_token === 'string' ? data.id_token : null;
    if (!token) {
      throw new Error(`bKash grant failed: ${data.statusMessage || JSON.stringify(data)}`);
    }

    // Cache token for 55 minutes (tokens typically expire after 1 hour)
    this.cachedToken = {
      token,
      expiresAt: Date.now() + 55 * 60 * 1000,
    };
    return token;
  }

  public async initializeSession(
    input: GatewaySessionInitInput,
  ): Promise<GatewaySessionInitResult> {
    const { paymentIntent } = input;
    const intentId = paymentIntent.id.value;
    const amountTaka = (paymentIntent.amountMinor / 100).toFixed(2);

    if (this.isSimulated()) {
      this.logger.log(
        `[bKash:Mock] Initializing mock tokenized checkout session for intent ${intentId} (${amountTaka} BDT)`,
      );
      const mockPaymentId = `BKASH_PID_${intentId.replace(/-/g, '').slice(0, 16)}`;
      const redirectUrl = `https://tokenized.sandbox.bka.sh/v1.2.0-beta/checkout?paymentID=${mockPaymentId}`;
      return {
        redirectUrl,
        gatewayReferenceId: mockPaymentId,
      };
    }

    const token = await this.getIdToken();
    const callbackBase =
      input.callbackUrl || `http://localhost:${this.appConfig.port}/api/v1/payments/gateways/bkash`;

    const res = await fetch(`${this.getBaseUrl()}/tokenized/checkout/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
        'X-APP-Key': this.appConfig.bkashAppKey!,
      },
      body: JSON.stringify({
        mode: '0011',
        payerReference: input.customerPhone || '01700000000',
        callbackURL: `${callbackBase}/callback`,
        amount: amountTaka,
        currency: paymentIntent.currencyCode,
        intent: 'sale',
        merchantInvoiceNumber: intentId,
      }),
    });

    if (!res.ok) {
      throw new Error(`bKash create payment failed with HTTP ${res.status}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    if (!data.bkashURL || !data.paymentID) {
      throw new Error(`bKash create payment error: ${data.statusMessage || JSON.stringify(data)}`);
    }

    return {
      redirectUrl: String(data.bkashURL),
      gatewayReferenceId: String(data.paymentID),
    };
  }

  public async verifyPayment(input: GatewayVerificationInput): Promise<GatewayVerificationResult> {
    const { paymentIntent, payload } = input;
    const statusRaw = String(payload.status || payload.transactionStatus || '').toLowerCase();

    if (statusRaw === 'cancel' || statusRaw === 'cancelled') {
      return {
        isSuccess: false,
        isCancelled: true,
        providerTransactionId: String(payload.trxID || ''),
        amountMinor: paymentIntent.amountMinor,
        currencyCode: paymentIntent.currencyCode,
        gatewayStatusCode: 'CANCEL',
        rawResponse: payload,
      };
    }

    if (statusRaw === 'fail' || statusRaw === 'failed' || statusRaw === 'failure') {
      return {
        isSuccess: false,
        isFailed: true,
        failureReason: String(
          payload.statusMessage || payload.message || 'Payment failed at bKash',
        ),
        providerTransactionId: String(payload.trxID || ''),
        amountMinor: paymentIntent.amountMinor,
        currencyCode: paymentIntent.currencyCode,
        gatewayStatusCode: 'FAIL',
        rawResponse: payload,
      };
    }

    if (this.isSimulated()) {
      this.logger.log(`[bKash:Mock] Verifying mock payment for intent ${paymentIntent.id.value}`);
      const trxId = String(payload.trxID || `BKASH_TRX_${Date.now()}`);
      return {
        isSuccess: true,
        providerTransactionId: trxId,
        amountMinor: paymentIntent.amountMinor,
        currencyCode: paymentIntent.currencyCode,
        gatewayStatusCode: 'Completed',
        rawResponse: { ...payload, transactionStatus: 'Completed', simulated: true },
      };
    }

    const paymentId = String(payload.paymentID || paymentIntent.gatewayReferenceId || '');
    if (!paymentId) {
      throw new Error('bKash execution requires paymentID.');
    }

    const token = await this.getIdToken();
    const res = await fetch(`${this.getBaseUrl()}/tokenized/checkout/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
        'X-APP-Key': this.appConfig.bkashAppKey!,
      },
      body: JSON.stringify({ paymentID: paymentId }),
    });

    if (!res.ok) {
      throw new Error(`bKash execute failed with HTTP ${res.status}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const txStatus = String(data.transactionStatus || '');
    const isSuccess = txStatus === 'Completed';

    const amountTaka = parseFloat(String(data.amount || '0'));
    const validatedAmountMinor = Math.round(amountTaka * 100);
    const trxId = String(data.trxID || '');

    return {
      isSuccess,
      providerTransactionId: trxId,
      amountMinor: validatedAmountMinor,
      currencyCode: String(data.currency || paymentIntent.currencyCode).toUpperCase(),
      gatewayStatusCode: txStatus,
      rawResponse: data,
      isFailed: !isSuccess,
      failureReason: isSuccess
        ? undefined
        : String(data.statusMessage || `bKash status: ${txStatus}`),
    };
  }

  public async refund(input: GatewayRefundInput): Promise<GatewayRefundResult> {
    const { paymentIntent, amountMinor, reason } = input;
    const amountTaka = (amountMinor / 100).toFixed(2);

    if (this.isSimulated()) {
      this.logger.log(
        `[bKash:Mock] Simulating refund for intent ${paymentIntent.id.value} (${amountTaka} BDT)`,
      );
      return {
        success: true,
        providerRefundId: `REF_BKASH_${Date.now()}`,
        providerResponseCode: 'Completed',
        rawResponse: { simulated: true, refund_amount: amountTaka },
      };
    }

    const paymentId = paymentIntent.gatewayReferenceId;
    const trxId = paymentIntent.providerTransactionId;
    if (!paymentId || !trxId) {
      throw new Error('Cannot refund bKash payment without paymentID and trxID.');
    }

    const token = await this.getIdToken();
    const res = await fetch(`${this.getBaseUrl()}/tokenized/checkout/payment/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
        'X-APP-Key': this.appConfig.bkashAppKey!,
      },
      body: JSON.stringify({
        paymentID: paymentId,
        trxID: trxId,
        amount: amountTaka,
        sku: `REFUND_${paymentIntent.orderId}`,
        reason: reason || 'Customer refund',
      }),
    });

    if (!res.ok) {
      throw new Error(`bKash refund failed with HTTP ${res.status}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const isSuccess = data.transactionStatus === 'Completed';
    return {
      success: isSuccess,
      providerRefundId: typeof data.refundTrxID === 'string' ? data.refundTrxID : null,
      providerResponseCode: String(data.transactionStatus || ''),
      rawResponse: data,
    };
  }
}
