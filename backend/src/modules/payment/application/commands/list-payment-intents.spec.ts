import { describe, expect, it, vi } from 'vitest';
import { PaymentAccessDeniedError } from '../errors/payment.errors';
import { ListPaymentIntentsHandler } from './payment.handlers';

describe('ListPaymentIntentsHandler', () => {
  it('rejects non-platform actors', async () => {
    const payments = { listRecentIntents: vi.fn() };
    const handler = new ListPaymentIntentsHandler(payments as never);
    await expect(
      handler.listRecentForPlatform({ actorRoles: ['VENDOR_OWNER'], limit: 10 }),
    ).rejects.toBeInstanceOf(PaymentAccessDeniedError);
    expect(payments.listRecentIntents).not.toHaveBeenCalled();
  });

  it('lists recent intents for platform admin', async () => {
    const rows = [{ id: { value: 'pi1' } }];
    const payments = { listRecentIntents: vi.fn().mockResolvedValue(rows) };
    const handler = new ListPaymentIntentsHandler(payments as never);
    const result = await handler.listRecentForPlatform({
      actorRoles: ['PLATFORM_ADMIN'],
      limit: 40,
    });
    expect(payments.listRecentIntents).toHaveBeenCalledWith(40);
    expect(result).toBe(rows);
  });
});
