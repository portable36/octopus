import { describe, expect, it, vi } from 'vitest';
import { NotificationEventConsumer } from './notification-event.consumer';

describe('NotificationEventConsumer', () => {
  it('notifies customer on CodCollected via order snapshot + contact', async () => {
    const notifications = {
      notify: vi.fn().mockResolvedValue({ notificationIds: ['n1'], created: true }),
    };
    const orders = {
      getNotificationSnapshot: vi.fn().mockResolvedValue({
        orderId: 'ord-1',
        orderNumber: 'ORD-1',
        customerId: 'user-1',
        totalMinor: 15000,
        currencyCode: 'BDT',
      }),
    };
    const contacts = { findEmailByUserId: vi.fn().mockResolvedValue('a@example.com') };
    const consumer = new NotificationEventConsumer(
      notifications as never,
      orders as never,
      contacts as never,
    );

    await consumer.handle('CodCollected', {
      orderId: 'ord-1',
      amountMinor: 15000,
      currencyCode: 'BDT',
    });

    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'notify:cod:ord-1',
        recipientUserId: 'user-1',
        recipientEmail: 'a@example.com',
        type: 'payment.cod_collected',
        category: 'TRANSACTIONAL',
        data: expect.objectContaining({ orderNumber: 'ORD-1', amountLabel: 'BDT 150.00' }),
      }),
    );
  });

  it('skips when order has no customerId', async () => {
    const notifications = { notify: vi.fn() };
    const orders = {
      getNotificationSnapshot: vi.fn().mockResolvedValue({
        orderId: 'ord-1',
        orderNumber: 'ORD-1',
        customerId: null,
        totalMinor: 100,
        currencyCode: 'BDT',
      }),
    };
    const consumer = new NotificationEventConsumer(
      notifications as never,
      orders as never,
      { findEmailByUserId: vi.fn() } as never,
    );

    await consumer.handle('ShipmentDelivered', { orderId: 'ord-1', shipmentId: 'ship-1' });
    expect(notifications.notify).not.toHaveBeenCalled();
  });
});
