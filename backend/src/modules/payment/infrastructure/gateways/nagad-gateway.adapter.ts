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
export class NagadGatewayAdapter implements PaymentGatewayPort {
  private readonly logger = new Logger(NagadGatewayAdapter.name);
  public readonly provider = 'NAGAD' as const;

  constructor(@Inject(AppConfigService) private readonly appConfig: AppConfigService) {}

  private isSimulated(): boolean {
    return (
      this.appConfig.paymentGatewayMode === 'sandbox-mock' ||
      !this.appConfig.nagadMerchantId ||
      !this.appConfig.nagadMerchantPrivateKey
    );
  }

  private getBaseUrl(): string {
    return this.appConfig.nagadIsSandbox
      ? 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs'
      : 'https://api.mynagad.com/api/dfs';
  }

  public async initializeSession(
    input: GatewaySessionInitInput,
  ): Promise<GatewaySessionInitResult> {
    const { paymentIntent } = input;
    const intentId = paymentIntent.id.value;
    const amountTaka = (paymentIntent.amountMinor / 100).toFixed(2);

    if (this.isSimulated()) {
      this.logger.log(
        `[Nagad:Mock] Initializing mock checkout session for intent ${intentId} (${amountTaka} BDT)`,
      );
      const mockRefId = `NAGAD_REF_${intentId.replace(/-/g, '').slice(0, 16)}`;
      const redirectUrl = `http://sandbox.mynagad.com:10080/check-out?payment_ref_id=${mockRefId}`;
      return {
        redirectUrl,
        gatewayReferenceId: mockRefId,
      };
    }

    const merchantId = this.appConfig.nagadMerchantId!;
    const callbackBase =
      input.callbackUrl || `http://localhost:${this.appConfig.port}/api/v1/payments/gateways/nagad`;

    const now = new Date();
    const dateTime = now
      .toISOString()
      .replace(/[-:T.]/g, '')
      .slice(0, 14);

    const initUrl = `${this.getBaseUrl()}/check-out/initialize/${merchantId}/${intentId}`;
    const res = await fetch(initUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-KM-Api-Version': 'v-0.2.0',
        'X-KM-IP-V4': '127.0.0.1',
        'X-KM-Client-Type': 'PC_WEB',
      },
      body: JSON.stringify({
        dateTime,
        sensitiveData: 'encrypted_sensitive_data',
        signature: 'merchant_signature',
        callbackUrl: `${callbackBase}/callback`,
      }),
    });

    if (!res.ok) {
      throw new Error(`Nagad session initialization failed with HTTP ${res.status}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const paymentRefId =
      typeof data.paymentReferenceId === 'string' ? data.paymentReferenceId : undefined;
    const redirectUrl = typeof data.callBackUrl === 'string' ? data.callBackUrl : undefined;

    if (!redirectUrl || !paymentRefId) {
      throw new Error(
        `Nagad session initialization failed: ${data.message || JSON.stringify(data)}`,
      );
    }

    return {
      redirectUrl,
      gatewayReferenceId: paymentRefId,
    };
  }

  public async verifyPayment(input: GatewayVerificationInput): Promise<GatewayVerificationResult> {
    const { paymentIntent, payload } = input;
    const statusRaw = String(payload.status || '').toLowerCase();

    if (statusRaw === 'cancel' || statusRaw === 'cancelled') {
      return {
        isSuccess: false,
        isCancelled: true,
        providerTransactionId: String(payload.payment_ref_id || payload.trxId || ''),
        amountMinor: paymentIntent.amountMinor,
        currencyCode: paymentIntent.currencyCode,
        gatewayStatusCode: 'CANCEL',
        rawResponse: payload,
      };
    }

    if (statusRaw === 'fail' || statusRaw === 'failed') {
      return {
        isSuccess: false,
        isFailed: true,
        failureReason: String(payload.message || 'Payment failed at Nagad'),
        providerTransactionId: String(payload.payment_ref_id || payload.trxId || ''),
        amountMinor: paymentIntent.amountMinor,
        currencyCode: paymentIntent.currencyCode,
        gatewayStatusCode: 'FAIL',
        rawResponse: payload,
      };
    }

    if (this.isSimulated()) {
      this.logger.log(`[Nagad:Mock] Verifying mock payment for intent ${paymentIntent.id.value}`);
      const trxId = String(payload.payment_ref_id || payload.trxId || `NAGAD_TRX_${Date.now()}`);
      return {
        isSuccess: true,
        providerTransactionId: trxId,
        amountMinor: paymentIntent.amountMinor,
        currencyCode: paymentIntent.currencyCode,
        gatewayStatusCode: 'Success',
        rawResponse: { ...payload, status: 'Success', simulated: true },
      };
    }

    const paymentRefId = String(payload.payment_ref_id || paymentIntent.gatewayReferenceId || '');
    if (!paymentRefId) {
      throw new Error('Nagad verification requires payment_ref_id.');
    }

    const verifyUrl = `${this.getBaseUrl()}/check-out/verify/${paymentRefId}`;
    const res = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'X-KM-Api-Version': 'v-0.2.0',
        'X-KM-IP-V4': '127.0.0.1',
        'X-KM-Client-Type': 'PC_WEB',
      },
    });

    if (!res.ok) {
      throw new Error(`Nagad verification failed with HTTP ${res.status}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const status = String(data.status || '');
    const isSuccess = status === 'Success';

    const amountTaka = parseFloat(String(data.amount || '0'));
    const validatedAmountMinor = Math.round(amountTaka * 100);
    const trxId = String(data.issuerPaymentRef || data.paymentRefId || paymentRefId);

    return {
      isSuccess,
      providerTransactionId: trxId,
      amountMinor: validatedAmountMinor,
      currencyCode: String(data.currency || paymentIntent.currencyCode).toUpperCase(),
      gatewayStatusCode: status,
      rawResponse: data,
      isFailed: !isSuccess,
      failureReason: isSuccess ? undefined : String(data.message || `Nagad status: ${status}`),
    };
  }

  public async refund(input: GatewayRefundInput): Promise<GatewayRefundResult> {
    const { paymentIntent, amountMinor, reason } = input;
    const amountTaka = (amountMinor / 100).toFixed(2);

    if (this.isSimulated()) {
      this.logger.log(
        `[Nagad:Mock] Simulating refund for intent ${paymentIntent.id.value} (${amountTaka} BDT)`,
      );
      return {
        success: true,
        providerRefundId: `REF_NAGAD_${Date.now()}`,
        providerResponseCode: 'Success',
        rawResponse: { simulated: true, refund_amount: amountTaka },
      };
    }

    const paymentRefId = paymentIntent.gatewayReferenceId;
    if (!paymentRefId) {
      throw new Error('Cannot refund Nagad payment without paymentReferenceId.');
    }

    const res = await fetch(`${this.getBaseUrl()}/check-out/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-KM-Api-Version': 'v-0.2.0',
      },
      body: JSON.stringify({
        paymentRefId,
        refundAmount: amountTaka,
        remarks: reason || 'Customer refund',
      }),
    });

    if (!res.ok) {
      throw new Error(`Nagad refund failed with HTTP ${res.status}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const isSuccess = data.status === 'Success';
    return {
      success: isSuccess,
      providerRefundId: typeof data.refundRefId === 'string' ? data.refundRefId : null,
      providerResponseCode: String(data.status || ''),
      rawResponse: data,
    };
  }
}
