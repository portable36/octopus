import type { CheckoutOutcome } from '../../domain/checkout.types';

export const CHECKOUT_REPOSITORY = Symbol('CHECKOUT_REPOSITORY');

export type CheckoutIdempotencyClaim =
  | { readonly status: 'CLAIMED'; readonly claimToken: string }
  | { readonly status: 'IN_PROGRESS'; readonly requestHash: string }
  | {
      readonly status: 'COMPLETED';
      readonly requestHash: string;
      readonly outcome: CheckoutOutcome;
    };

export interface CheckoutRepository {
  claim(input: {
    readonly idempotencyKey: string;
    readonly requestHash: string;
    readonly customerId: string | null;
    readonly guestToken: string | null;
    readonly cartId: string;
    readonly claimToken: string;
  }): Promise<CheckoutIdempotencyClaim>;
  complete(input: {
    readonly idempotencyKey: string;
    readonly claimToken: string;
    readonly outcome: CheckoutOutcome;
  }): Promise<void>;
  release(input: { readonly idempotencyKey: string; readonly claimToken: string }): Promise<void>;
  findCompletedByIdempotencyKey(idempotencyKey: string): Promise<CheckoutOutcome | null>;
  saveCompleted(input: {
    readonly idempotencyKey: string;
    readonly requestHash: string;
    readonly customerId: string | null;
    readonly guestToken: string | null;
    readonly outcome: CheckoutOutcome;
  }): Promise<void>;
}
