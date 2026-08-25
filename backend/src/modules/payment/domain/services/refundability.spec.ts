import { describe, expect, it } from 'vitest';
import { RefundNotRefundableError } from '../errors/payment.errors';
import { resolveRefundMethod } from './refundability';

describe('resolveRefundMethod', () => {
  it('allows MANUAL refund only for collected COD', () => {
    expect(resolveRefundMethod({ paymentMethod: 'COD', status: 'COLLECTED' })).toBe('MANUAL');
  });

  it('refuses uncollected COD', () => {
    expect(() =>
      resolveRefundMethod({ paymentMethod: 'COD', status: 'AWAITING_COLLECTION' }),
    ).toThrow(RefundNotRefundableError);
  });

  it('refuses unpaid gateway intents', () => {
    expect(() =>
      resolveRefundMethod({ paymentMethod: 'BKASH', status: 'REQUIRES_PAYMENT' }),
    ).toThrow(RefundNotRefundableError);
  });
});
