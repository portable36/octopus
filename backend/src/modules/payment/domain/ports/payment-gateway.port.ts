import type { PaymentIntent } from '../aggregates/payment-intent.aggregate';
import type { PaymentMethod } from '../payment.types';

export const PAYMENT_GATEWAY_PORT = Symbol('PAYMENT_GATEWAY_PORT');

export interface GatewaySessionInitInput {
  readonly paymentIntent: PaymentIntent;
  readonly customerEmail?: string | undefined;
  readonly customerPhone?: string | undefined;
  readonly customerName?: string | undefined;
  readonly callbackUrl?: string | undefined;
}

export interface GatewaySessionInitResult {
  readonly redirectUrl: string;
  readonly gatewayReferenceId?: string | undefined;
}

export interface GatewayVerificationInput {
  readonly paymentIntent: PaymentIntent;
  readonly payload: Record<string, unknown>;
}

export interface GatewayVerificationResult {
  readonly isSuccess: boolean;
  readonly providerTransactionId: string;
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly gatewayStatusCode: string;
  readonly rawResponse: Record<string, unknown>;
  readonly isCancelled?: boolean | undefined;
  readonly isFailed?: boolean | undefined;
  readonly failureReason?: string | undefined;
}

export interface GatewayRefundInput {
  readonly paymentIntent: PaymentIntent;
  readonly refundId: string;
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly reason?: string | null | undefined;
}

export interface GatewayRefundResult {
  readonly success: boolean;
  readonly providerRefundId?: string | null | undefined;
  readonly providerResponseCode?: string | null | undefined;
  readonly rawResponse: Record<string, unknown>;
}

export interface PaymentGatewayPort {
  readonly provider: PaymentMethod;
  initializeSession(input: GatewaySessionInitInput): Promise<GatewaySessionInitResult>;
  verifyPayment(input: GatewayVerificationInput): Promise<GatewayVerificationResult>;
  refund(input: GatewayRefundInput): Promise<GatewayRefundResult>;
}
