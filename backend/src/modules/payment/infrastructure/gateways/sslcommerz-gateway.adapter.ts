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
export class SslCommerzGatewayAdapter implements PaymentGatewayPort {
  private readonly logger = new Logger(SslCommerzGatewayAdapter.name);
  public readonly provider = 'SSLCOMMERZ' as const;

  constructor(@Inject(AppConfigService) private readonly appConfig: AppConfigService) {}

  private isSimulated(): boolean {
    return (
      this.appConfig.paymentGatewayMode === 'sandbox-mock' ||
      !this.appConfig.sslCommerzStoreId ||
      !this.appConfig.sslCommerzStorePasswd
    );
  }

  private getBaseUrl(): string {
    return this.appConfig.sslCommerzIsSandbox
      ? 'https://sandbox.sslcommerz.com'
      : 'https://securepay.sslcommerz.com';
  }

  public async initializeSession(
    input: GatewaySessionInitInput,
  ): Promise<GatewaySessionInitResult> {
    const { paymentIntent } = input;
    const intentId = paymentIntent.id.value;
    const amountTaka = (paymentIntent.amountMinor / 100).toFixed(2);

    if (this.isSimulated()) {
      this.logger.log(
        `[SSLCommerz:Mock] Initializing mock session for intent ${intentId} (${amountTaka} BDT)`,
      );
      const mockSessionKey = `ssl_mock_${intentId.replace(/-/g, '').slice(0, 16)}`;
      const redirectUrl = `https://sandbox.sslcommerz.com/gwprocess/v4/simulator?tran_id=${intentId}&amount=${amountTaka}&sessionkey=${mockSessionKey}`;
      return {
        redirectUrl,
        gatewayReferenceId: mockSessionKey,
      };
    }

    const storeId = this.appConfig.sslCommerzStoreId!;
    const storePasswd = this.appConfig.sslCommerzStorePasswd!;
    const callbackBase =
      input.callbackUrl ||
      `http://localhost:${this.appConfig.port}/api/v1/payments/gateways/sslcommerz`;

    const formData = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePasswd,
      total_amount: amountTaka,
      currency: paymentIntent.currencyCode,
      tran_id: intentId,
      success_url: `${callbackBase}/callback`,
      fail_url: `${callbackBase}/callback`,
      cancel_url: `${callbackBase}/callback`,
      ipn_url: `${callbackBase}/ipn`,
      cus_name: input.customerName || 'Customer',
      cus_email: input.customerEmail || 'customer@example.com',
      cus_add1: 'Dhaka',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      cus_phone: input.customerPhone || '01700000000',
      shipping_method: 'NO',
      product_name: `Order ${paymentIntent.orderId}`,
      product_category: 'Ecommerce',
      product_profile: 'general',
    });

    const response = await fetch(`${this.getBaseUrl()}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error(
        `SSLCommerz init failed with HTTP ${response.status}: ${await response.text()}`,
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    if (data.status !== 'SUCCESS' || typeof data.GatewayPageURL !== 'string') {
      throw new Error(
        `SSLCommerz session init error: ${data.failedreason || JSON.stringify(data)}`,
      );
    }

    return {
      redirectUrl: data.GatewayPageURL,
      gatewayReferenceId: typeof data.sessionkey === 'string' ? data.sessionkey : undefined,
    };
  }

  public async verifyPayment(input: GatewayVerificationInput): Promise<GatewayVerificationResult> {
    const { paymentIntent, payload } = input;
    const statusRaw = String(payload.status || payload.tran_status || '').toUpperCase();

    if (statusRaw === 'CANCEL' || statusRaw === 'CANCELLED') {
      return {
        isSuccess: false,
        isCancelled: true,
        providerTransactionId: String(payload.bank_tran_id || payload.tran_id || ''),
        amountMinor: paymentIntent.amountMinor,
        currencyCode: paymentIntent.currencyCode,
        gatewayStatusCode: statusRaw,
        rawResponse: payload,
      };
    }

    if (statusRaw === 'FAIL' || statusRaw === 'FAILED') {
      return {
        isSuccess: false,
        isFailed: true,
        failureReason: String(payload.error || payload.failedreason || 'Payment failed at gateway'),
        providerTransactionId: String(payload.bank_tran_id || payload.tran_id || ''),
        amountMinor: paymentIntent.amountMinor,
        currencyCode: paymentIntent.currencyCode,
        gatewayStatusCode: statusRaw,
        rawResponse: payload,
      };
    }

    if (this.isSimulated()) {
      this.logger.log(
        `[SSLCommerz:Mock] Verifying mock payment for intent ${paymentIntent.id.value}`,
      );
      const trxId = String(payload.bank_tran_id || payload.val_id || `SSL_TRX_${Date.now()}`);
      return {
        isSuccess: true,
        providerTransactionId: trxId,
        amountMinor: paymentIntent.amountMinor,
        currencyCode: paymentIntent.currencyCode,
        gatewayStatusCode: 'VALID',
        rawResponse: { ...payload, validated_by: 'mock' },
      };
    }

    const valId = String(payload.val_id || '');
    if (!valId) {
      throw new Error('SSLCommerz verification missing val_id parameter.');
    }

    const storeId = this.appConfig.sslCommerzStoreId!;
    const storePasswd = this.appConfig.sslCommerzStorePasswd!;
    const validationUrl = `${this.getBaseUrl()}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(
      valId,
    )}&store_id=${encodeURIComponent(storeId)}&store_passwd=${encodeURIComponent(
      storePasswd,
    )}&v=1&format=json`;

    const res = await fetch(validationUrl);
    if (!res.ok) {
      throw new Error(`SSLCommerz server verification failed with HTTP ${res.status}`);
    }

    const valData = (await res.json()) as Record<string, unknown>;
    const valStatus = String(valData.status || '').toUpperCase();
    const isValid = valStatus === 'VALID' || valStatus === 'VALIDATED';

    if (valData.risk_level === 1 || valData.risk_level === '1') {
      this.logger.warn(
        `[SSLCommerz] Risky transaction detected for intent ${paymentIntent.id.value}: ${valData.risk_title || 'Risk Level 1'}`,
      );
    }

    const validatedAmountTaka = parseFloat(
      String(valData.currency_amount || valData.amount || '0'),
    );
    const validatedAmountMinor = Math.round(validatedAmountTaka * 100);
    const bankTranId = String(valData.bank_tran_id || valId);

    return {
      isSuccess: isValid,
      providerTransactionId: bankTranId,
      amountMinor: validatedAmountMinor,
      currencyCode: String(valData.currency_type || paymentIntent.currencyCode).toUpperCase(),
      gatewayStatusCode: valStatus,
      rawResponse: valData,
      isFailed: !isValid,
      failureReason: isValid ? undefined : `SSLCommerz validation status: ${valStatus}`,
    };
  }

  public async refund(input: GatewayRefundInput): Promise<GatewayRefundResult> {
    const { paymentIntent, amountMinor, reason } = input;
    const amountTaka = (amountMinor / 100).toFixed(2);

    if (this.isSimulated()) {
      this.logger.log(
        `[SSLCommerz:Mock] Simulating refund for intent ${paymentIntent.id.value} (${amountTaka} BDT)`,
      );
      return {
        success: true,
        providerRefundId: `REF_SSL_${Date.now()}`,
        providerResponseCode: 'REFUNDED',
        rawResponse: { simulated: true, refund_amount: amountTaka },
      };
    }

    const bankTranId = paymentIntent.providerTransactionId;
    if (!bankTranId) {
      throw new Error('Cannot refund SSLCommerz payment without bank_tran_id.');
    }

    const storeId = this.appConfig.sslCommerzStoreId!;
    const storePasswd = this.appConfig.sslCommerzStorePasswd!;
    const refundTransId = input.refundId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 30);
    const refundUrl = `${this.getBaseUrl()}/validator/api/merchantTransIDvalidationAPI.php?bank_tran_id=${encodeURIComponent(
      bankTranId,
    )}&refund_trans_id=${encodeURIComponent(refundTransId)}&refund_amount=${encodeURIComponent(
      amountTaka,
    )}&refund_remarks=${encodeURIComponent(
      reason || 'Customer refund',
    )}&store_id=${encodeURIComponent(storeId)}&store_passwd=${encodeURIComponent(
      storePasswd,
    )}&v=1&format=json`;

    const res = await fetch(refundUrl);
    if (!res.ok) {
      throw new Error(`SSLCommerz refund API failed with HTTP ${res.status}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const isSuccess = data.status === 'success' || data.status === 'SUCCESS';
    return {
      success: isSuccess,
      providerRefundId: typeof data.refund_ref_id === 'string' ? data.refund_ref_id : null,
      providerResponseCode: String(data.status || ''),
      rawResponse: data,
    };
  }
}
