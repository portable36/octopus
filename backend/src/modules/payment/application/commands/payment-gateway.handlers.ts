import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type Redis from 'ioredis';
import { AUDIT_PORT, type AuditPort } from '../../../../shared-kernel/application/ports/audit.port';
import { ORDER_PORT, type OrderPort } from '../../../../shared-kernel/application/ports/order.port';
import { REDIS_CLIENT } from '../../../../shared-kernel/infrastructure/redis/redis.constants';
import { PaymentIntent } from '../../domain/aggregates/payment-intent.aggregate';
import {
  CodAmountMismatchError,
  InvalidPaymentMoneyError,
} from '../../domain/errors/payment.errors';
import type { PaymentIntentStatus, PaymentMethod } from '../../domain/payment.types';
import { PaymentNotFoundError, PaymentProviderUnavailableError } from '../errors/payment.errors';
import { PAYMENT_REPOSITORY, type PaymentRepository } from '../ports/payment-repository.interface';
import { PaymentGatewayRegistry } from '../../infrastructure/gateways/payment-gateway-registry';

export interface ProcessGatewayCallbackInput {
  readonly provider: PaymentMethod;
  readonly payload: Record<string, unknown>;
  readonly paymentIntentId?: string | undefined;
}

export interface ProcessGatewayCallbackResult {
  readonly success: boolean;
  readonly paymentIntentId: string;
  readonly orderId: string;
  readonly status: PaymentIntentStatus;
  readonly providerTransactionId?: string | undefined;
  readonly message?: string | undefined;
  readonly isDuplicate?: boolean | undefined;
}

@Injectable()
export class ProcessGatewayCallbackHandler {
  private readonly logger = new Logger(ProcessGatewayCallbackHandler.name);

  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(PaymentGatewayRegistry) private readonly gatewayRegistry: PaymentGatewayRegistry,
    @Inject(ORDER_PORT) private readonly orders: OrderPort,
    @Optional() @Inject(AUDIT_PORT) private readonly audit?: AuditPort,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: Redis,
  ) {}

  public async execute(input: ProcessGatewayCallbackInput): Promise<ProcessGatewayCallbackResult> {
    const { provider, payload } = input;

    // 1. Resolve payment intent
    const intent = await this.resolveIntent(input);
    if (!intent) {
      throw new PaymentNotFoundError(
        `No payment intent matching gateway callback for provider ${provider}`,
      );
    }

    const adapter = this.gatewayRegistry.get(provider);
    if (!adapter) {
      throw new PaymentProviderUnavailableError();
    }

    // 2. Perform external verification outside database transaction
    const verification = await adapter.verifyPayment({
      paymentIntent: intent,
      payload,
    });

    // 3. Handle user cancellation
    if (verification.isCancelled) {
      intent.cancelGateway();
      await this.payments.saveIntent(intent);
      this.logger.log(`Payment intent ${intent.id.value} cancelled by user at ${provider}`);
      return {
        success: false,
        paymentIntentId: intent.id.value,
        orderId: intent.orderId,
        status: intent.status,
        message: 'Payment cancelled by customer',
      };
    }

    // 4. Handle failure
    if (verification.isFailed || !verification.isSuccess) {
      const reason = verification.failureReason || 'Payment failed at gateway';
      intent.markFailed(reason);
      await this.payments.saveIntent(intent);
      this.logger.warn(`Payment intent ${intent.id.value} failed at ${provider}: ${reason}`);
      return {
        success: false,
        paymentIntentId: intent.id.value,
        orderId: intent.orderId,
        status: intent.status,
        message: reason,
      };
    }

    // 5. If already captured, return idempotent success
    if (intent.status === 'CAPTURED') {
      return {
        success: true,
        isDuplicate: true,
        paymentIntentId: intent.id.value,
        orderId: intent.orderId,
        status: intent.status,
        providerTransactionId: intent.providerTransactionId ?? verification.providerTransactionId,
        message: 'Payment intent was already captured',
      };
    }

    // 6. Verify exact amount and currency match
    if (verification.amountMinor !== intent.amountMinor) {
      intent.markFailed('Amount mismatch');
      await this.payments.saveIntent(intent);
      throw new CodAmountMismatchError(
        `Gateway amount ${verification.amountMinor} does not match intent ${intent.amountMinor}`,
      );
    }
    if (verification.currencyCode.toUpperCase() !== intent.currencyCode.toUpperCase()) {
      intent.markFailed('Currency mismatch');
      await this.payments.saveIntent(intent);
      throw new InvalidPaymentMoneyError(
        `Gateway currency ${verification.currencyCode} does not match intent ${intent.currencyCode}`,
      );
    }

    // 7. Replay guard via Redis
    if (this.redis) {
      const replayKey = `payment:replay:${provider}:${verification.providerTransactionId}`;
      const acquired = await this.redis.set(replayKey, 'LOCKED', 'EX', 86400, 'NX');
      if (!acquired) {
        this.logger.warn(
          `Replay detected for ${provider} trxID ${verification.providerTransactionId}. Ignoring duplicate execution.`,
        );
        return {
          success: true,
          isDuplicate: true,
          paymentIntentId: intent.id.value,
          orderId: intent.orderId,
          status: intent.status,
          providerTransactionId: verification.providerTransactionId,
          message: 'Duplicate callback ignored via Redis replay protection',
        };
      }
    }

    // 8. Atomically capture payment intent, record transaction, and update order
    intent.markCaptured(
      verification.providerTransactionId,
      String(payload.val_id || payload.paymentID || payload.payment_ref_id || ''),
    );
    await this.payments.saveIntent(intent);

    await this.payments.saveCodCollection({
      paymentIntentId: intent.id.value,
      orderId: intent.orderId,
      collectorUserId: '00000000-0000-0000-0000-000000000000',
      amountMinor: intent.amountMinor,
      currencyCode: intent.currencyCode,
      note: `${provider} capture: ${verification.providerTransactionId}`,
      idempotencyKey: `gw_cap_${provider}_${verification.providerTransactionId}`,
      collectedAt: new Date(),
    });

    await this.orders.markPaidFromPayment({
      orderId: intent.orderId,
      paymentIntentId: intent.id.value,
      amountMinor: intent.amountMinor,
      currencyCode: intent.currencyCode,
    });

    if (this.audit) {
      await this.audit.append({
        actorUserId: null,
        action: 'payment.gateway.captured',
        resourceType: 'PaymentIntent',
        resourceId: intent.id.value,
        vendorId: intent.vendorId,
        storeId: intent.storeId,
        after: {
          orderId: intent.orderId,
          provider,
          providerTransactionId: verification.providerTransactionId,
          amountMinor: intent.amountMinor,
          currencyCode: intent.currencyCode,
        },
      });
    }

    this.logger.log(
      `[${provider}] Payment captured successfully for intent ${intent.id.value}, order ${intent.orderId}, trx ${verification.providerTransactionId}`,
    );

    return {
      success: true,
      paymentIntentId: intent.id.value,
      orderId: intent.orderId,
      status: 'CAPTURED',
      providerTransactionId: verification.providerTransactionId,
    };
  }

  private async resolveIntent(input: ProcessGatewayCallbackInput): Promise<PaymentIntent | null> {
    const { provider, payload, paymentIntentId } = input;

    // Explicit paymentIntentId
    if (paymentIntentId) {
      const byId = await this.payments.findIntentById(paymentIntentId);
      if (byId) return byId;
    }

    // Provider specific references
    if (provider === 'SSLCOMMERZ') {
      const tranId = String(payload.tran_id || '');
      if (tranId) {
        const byId = await this.payments.findIntentById(tranId);
        if (byId) return byId;
      }
    }

    if (provider === 'BKASH') {
      const paymentId = String(payload.paymentID || payload.paymentId || '');
      if (paymentId) {
        const byRef = await this.payments.findIntentByGatewayReference(paymentId);
        if (byRef) return byRef;
      }
      const invoiceNum = String(payload.merchantInvoiceNumber || '');
      if (invoiceNum) {
        const byId = await this.payments.findIntentById(invoiceNum);
        if (byId) return byId;
      }
    }

    if (provider === 'NAGAD') {
      const orderId = String(payload.order_id || '');
      if (orderId) {
        const byOrder = await this.payments.findIntentByOrderId(orderId);
        if (byOrder) return byOrder;
      }
      const refId = String(payload.payment_ref_id || '');
      if (refId) {
        const byRef = await this.payments.findIntentByGatewayReference(refId);
        if (byRef) return byRef;
      }
    }

    return null;
  }
}
