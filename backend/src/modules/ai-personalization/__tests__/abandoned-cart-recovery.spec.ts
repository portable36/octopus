import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Queue } from 'bullmq';
import { AbandonedCartRecoveryService } from '../application/services/abandoned-cart-recovery.service';
import { abandonedCartJobId } from '../application/abandoned-cart.types';
import { AbandonedCartSchedulerService } from '../jobs/abandoned-cart-scheduler.service';
import { AI_PERSONALIZATION_JOB_NAMES } from '../jobs/ai-personalization.constants';

describe('AbandonedCartSchedulerService', () => {
  const config = { isTest: false, outboxDispatchEnabled: true } as never;
  let queue: Queue;
  let enqueuer: { getQueue: () => Queue };
  let scheduler: AbandonedCartSchedulerService;

  beforeEach(() => {
    queue = {
      getJob: vi.fn(),
      add: vi.fn(),
    } as unknown as Queue;
    enqueuer = { getQueue: () => queue };
    scheduler = new AbandonedCartSchedulerService(config, enqueuer as never);
  });

  it('schedules check-abandoned-cart with a 30-minute delay', async () => {
    vi.mocked(queue.getJob).mockResolvedValue(undefined);

    await scheduler.scheduleCartCheck('cart-1');

    expect(queue.add).toHaveBeenCalledWith(
      AI_PERSONALIZATION_JOB_NAMES.checkAbandonedCart,
      expect.objectContaining({ cartId: 'cart-1' }),
      expect.objectContaining({
        jobId: abandonedCartJobId('cart-1'),
        delay: 30 * 60 * 1000,
      }),
    );
  });

  it('removes an existing delayed job before rescheduling', async () => {
    const remove = vi.fn();
    vi.mocked(queue.getJob).mockResolvedValue({ remove } as never);

    await scheduler.scheduleCartCheck('cart-1');

    expect(remove).toHaveBeenCalledOnce();
    expect(queue.add).toHaveBeenCalledOnce();
  });
});

describe('AbandonedCartRecoveryService purchase cancellation', () => {
  it('dequeues the delayed recovery job when an order is created', async () => {
    const scheduler = {
      scheduleCartCheck: vi.fn(),
      cancelCartCheck: vi.fn(),
    };
    const carts = {
      findById: vi.fn(),
    };
    const promotions = {
      save: vi.fn(),
    };
    const outboxPublisher = {
      publish: vi.fn(),
    };
    const em = {
      getConnection: () => ({
        execute: vi.fn(async () => [{ cart_id: 'cart-99' }]),
      }),
    };

    const service = new AbandonedCartRecoveryService(
      scheduler as never,
      carts as never,
      promotions as never,
      outboxPublisher as never,
      em as never,
    );

    await service.handle('OrderCreated', { orderId: 'order-1' });

    expect(scheduler.cancelCartCheck).toHaveBeenCalledWith('cart-99');
    expect(scheduler.cancelCartCheck).toHaveBeenCalledOnce();
  });

  it('cancels recovery on PaymentProcessed events', async () => {
    const scheduler = {
      scheduleCartCheck: vi.fn(),
      cancelCartCheck: vi.fn(),
    };
    const em = {
      getConnection: () => ({
        execute: vi.fn(async () => [{ cart_id: 'cart-55' }]),
      }),
    };

    const service = new AbandonedCartRecoveryService(
      scheduler as never,
      {} as never,
      {} as never,
      {} as never,
      em as never,
    );

    await service.handle('PaymentProcessed', { orderId: 'order-9' });

    expect(scheduler.cancelCartCheck).toHaveBeenCalledWith('cart-55');
  });
});
