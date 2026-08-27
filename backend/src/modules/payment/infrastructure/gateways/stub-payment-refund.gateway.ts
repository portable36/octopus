import { Injectable } from '@nestjs/common';
import { withExternalSpan } from '../../../../shared-kernel/infrastructure/observability/external-span';
import type {
  PaymentRefundGateway,
  PaymentRefundGatewayRequest,
  PaymentRefundGatewayResult,
} from '../../application/ports/payment-refund-gateway.port';

/**
 * Stub gateway refunds until live SSLCommerz/bKash/Nagad adapters ship.
 * MANUAL (COD cash return) never calls a network provider.
 */
@Injectable()
export class StubPaymentRefundGateway implements PaymentRefundGateway {
  public async execute(input: PaymentRefundGatewayRequest): Promise<PaymentRefundGatewayResult> {
    return withExternalSpan(
      'payment.refund.provider',
      {
        'octopus.payment.provider': input.provider,
        'octopus.payment.refund_method': input.method,
        'octopus.payment.payment_method': input.paymentMethod,
        'octopus.payment.refund_id': input.refundId,
        'octopus.payment.intent_id': input.paymentIntentId,
        'octopus.payment.currency': input.currencyCode,
      },
      async (span) => {
        const receivedAt = new Date();
        if (input.method === 'MANUAL') {
          const result: PaymentRefundGatewayResult = {
            ok: true,
            providerRefundId: `manual:${input.refundId}`,
            responseCode: 'MANUAL_OK',
            receivedAt,
          };
          span.setAttribute('octopus.payment.response_code', result.responseCode);
          span.setAttribute('octopus.payment.ok', result.ok);
          return result;
        }

        // ponytail: always-succeed stub; real adapters verify capture + provider signatures.
        const result: PaymentRefundGatewayResult = {
          ok: true,
          providerRefundId: `stub-refund:${input.provider}:${input.refundId.slice(0, 8)}`,
          responseCode: 'STUB_OK',
          receivedAt,
        };
        span.setAttribute('octopus.payment.response_code', result.responseCode);
        span.setAttribute('octopus.payment.ok', result.ok);
        return result;
      },
    );
  }
}
