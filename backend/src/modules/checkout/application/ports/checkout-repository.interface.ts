import type { CheckoutOutcome } from '../../domain/checkout.types';

export const CHECKOUT_REPOSITORY = Symbol('CHECKOUT_REPOSITORY');

export interface CheckoutRepository {
  findCompletedByIdempotencyKey(idempotencyKey: string): Promise<CheckoutOutcome | null>;
  saveCompleted(input: {
    readonly idempotencyKey: string;
    readonly requestHash: string;
    readonly customerId: string | null;
    readonly guestToken: string | null;
    readonly outcome: CheckoutOutcome;
  }): Promise<void>;
}
