import { Inject, Injectable, Logger } from '@nestjs/common';
import { withExternalSpan } from '../../../../shared-kernel/infrastructure/observability/external-span';
import type {
  PaymentRefundGateway,
  PaymentRefundGatewayRequest,
  PaymentRefundGatewayResult,
} from '../../application/ports/payment-refund-gateway.port';
import {
  PAYMENT_REPOSITORY,
  type PaymentRepository,
} from '../../application/ports/payment-repository.interface';
import { PaymentGatewayRegistry } from './payment-gateway-registry';

@Injectable()
export class PaymentGatewayRefundDispatcher implements PaymentRefundGateway {
  private readonly logger = new Logger(PaymentGatewayRefundDispatcher.name);

  constructor(
    @Inject(PaymentGatewayRegistry) private readonly gatewayRegistry: PaymentGatewayRegistry,
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
  ) {}

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

        const adapter = this.gatewayRegistry.get(input.paymentMethod);
        if (!adapter) {
          this.logger.warn(
            `No gateway adapter registered for payment method ${input.paymentMethod}`,
          );
          const result: PaymentRefundGatewayResult = {
            ok: false,
            providerRefundId: null,
            responseCode: 'PROVIDER_NOT_CONFIGURED',
            receivedAt,
          };
          span.setAttribute('octopus.payment.response_code', result.responseCode);
          span.setAttribute('octopus.payment.ok', result.ok);
          return result;
        }

        const intent = await this.payments.findIntentById(input.paymentIntentId);
        if (!intent) {
          const result: PaymentRefundGatewayResult = {
            ok: false,
            providerRefundId: null,
            responseCode: 'INTENT_NOT_FOUND',
            receivedAt,
          };
          span.setAttribute('octopus.payment.response_code', result.responseCode);
          span.setAttribute('octopus.payment.ok', result.ok);
          return result;
        }

        try {
          const res = await adapter.refund({
            paymentIntent: intent,
            refundId: input.refundId,
            amountMinor: input.amountMinor,
            currencyCode: input.currencyCode,
            reason: `Refund for order ${intent.orderId}`,
          });

          const result: PaymentRefundGatewayResult = {
            ok: res.success,
            providerRefundId: res.providerRefundId ?? null,
            responseCode: res.providerResponseCode ?? (res.success ? 'REFUND_OK' : 'REFUND_FAILED'),
            receivedAt: new Date(),
          };
          span.setAttribute('octopus.payment.response_code', result.responseCode);
          span.setAttribute('octopus.payment.ok', result.ok);
          return result;
        } catch (error) {
          this.logger.error(`Gateway refund error for intent ${intent.id.value}: ${error}`);
          const result: PaymentRefundGatewayResult = {
            ok: false,
            providerRefundId: null,
            responseCode: 'PROVIDER_ERROR',
            receivedAt: new Date(),
          };
          span.setAttribute('octopus.payment.response_code', result.responseCode);
          span.setAttribute('octopus.payment.ok', result.ok);
          return result;
        }
      },
    );
  }
}
