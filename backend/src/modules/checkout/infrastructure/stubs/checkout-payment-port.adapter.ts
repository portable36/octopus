import { Injectable } from '@nestjs/common';
import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import type {
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
  PaymentPort,
} from '../../../../shared-kernel/application/ports/payment.port';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import { CheckoutPaymentIntentOrmEntity } from '../persistence/checkout.orm-entity';

/**
 * Temporary PaymentPort adapter (Phase 09). Phase 11 replaces this with the Payment module.
 */
@Injectable()
export class CheckoutPaymentPortAdapter implements PaymentPort {
  constructor(private readonly em: EntityManager) {}

  public async createIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
    return withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(CheckoutPaymentIntentOrmEntity, {
        idempotencyKey: input.idempotencyKey,
      });
      if (existing) {
        return {
          paymentIntentId: existing.id,
          status: 'REQUIRES_PAYMENT',
          amountMinor: existing.amountMinor,
          currencyCode: existing.currencyCode,
          clientSecret: existing.clientSecret,
        };
      }

      const entity = new CheckoutPaymentIntentOrmEntity();
      entity.id = UniqueID.create().value;
      entity.checkoutId = input.checkoutId;
      entity.idempotencyKey = input.idempotencyKey;
      entity.customerId = input.customerId;
      entity.currencyCode = input.currencyCode;
      entity.amountMinor = input.amountMinor;
      entity.status = 'REQUIRES_PAYMENT';
      entity.clientSecret = `pi_secret_${entity.id.replace(/-/g, '').slice(0, 24)}`;
      entity.orderIdsJson = [...input.orderIds];
      entity.createdAt = new Date();

      try {
        await tx.persist(entity).flush();
      } catch (error) {
        if (error instanceof UniqueConstraintViolationException) {
          const raced = await tx.findOneOrFail(CheckoutPaymentIntentOrmEntity, {
            idempotencyKey: input.idempotencyKey,
          });
          return {
            paymentIntentId: raced.id,
            status: 'REQUIRES_PAYMENT',
            amountMinor: raced.amountMinor,
            currencyCode: raced.currencyCode,
            clientSecret: raced.clientSecret,
          };
        }
        throw error;
      }

      return {
        paymentIntentId: entity.id,
        status: 'REQUIRES_PAYMENT',
        amountMinor: entity.amountMinor,
        currencyCode: entity.currencyCode,
        clientSecret: entity.clientSecret,
      };
    });
  }
}
