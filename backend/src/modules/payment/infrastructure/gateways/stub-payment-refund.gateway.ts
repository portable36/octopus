import { Injectable } from '@nestjs/common';
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
    const receivedAt = new Date();
    if (input.method === 'MANUAL') {
      return {
        ok: true,
        providerRefundId: `manual:${input.refundId}`,
        responseCode: 'MANUAL_OK',
        receivedAt,
      };
    }

    // ponytail: always-succeed stub; real adapters verify capture + provider signatures.
    return {
      ok: true,
      providerRefundId: `stub-refund:${input.provider}:${input.refundId.slice(0, 8)}`,
      responseCode: 'STUB_OK',
      receivedAt,
    };
  }
}
