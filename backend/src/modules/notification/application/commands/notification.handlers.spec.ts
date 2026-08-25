import { describe, expect, it, vi } from 'vitest';
import { NotificationHandlers } from './notification.handlers';

describe('NotificationHandlers', () => {
  it('creates IN_APP + EMAIL and enqueues email once', async () => {
    const repo = {
      findByIdempotency: vi.fn().mockResolvedValue(null),
      findLatestTemplate: vi.fn(async (_k: string, channel: string) => ({
        id: 't1',
        templateKey: 'account.welcome',
        channel,
        locale: 'en',
        version: 1,
        subject: channel === 'EMAIL' ? 'Welcome {{name}}' : null,
        bodyText: 'Hello {{name}}',
      })),
      insertIgnoreConflict: vi.fn(async (input: { id: string }) => ({
        ...input,
        readAt: null,
      })),
      appendDeliveryAttempt: vi.fn(),
      findById: vi.fn(),
      listInAppForUser: vi.fn(),
      markRead: vi.fn(),
      updateDeliveryStatus: vi.fn(),
      countDeliveryAttempts: vi.fn(),
      getPreferences: vi.fn().mockResolvedValue({
        userId: 'u',
        marketingEmail: false,
        marketingInApp: false,
      }),
      upsertPreferences: vi.fn(),
    };
    const email = { send: vi.fn() };
    const enqueuer = { enqueueEmailDelivery: vi.fn() };
    const handlers = new NotificationHandlers(repo as never, email as never, enqueuer as never);

    const result = await handlers.notify({
      eventId: 'evt-1',
      recipientUserId: '11111111-1111-7111-8111-111111111111',
      recipientEmail: 'a@example.com',
      type: 'account.welcome',
      templateKey: 'account.welcome',
      category: 'TRANSACTIONAL',
      channels: ['IN_APP', 'EMAIL'],
      data: { name: 'Ada' },
    });

    expect(result.notificationIds).toHaveLength(2);
    expect(result.created).toBe(true);
    expect(enqueuer.enqueueEmailDelivery).toHaveBeenCalledTimes(1);
    expect(repo.appendDeliveryAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'IN_APP', status: 'SENT' }),
    );
  });

  it('is idempotent on duplicate eventId', async () => {
    const existing = {
      id: 'n1',
      eventId: 'evt-1',
      recipientUserId: 'u1',
      recipientEmail: null,
      notificationType: 'account.welcome',
      channel: 'IN_APP',
      locale: 'en',
      templateKey: 'account.welcome',
      templateVersion: 1,
      title: 'x',
      body: 'x',
      payload: {},
      deliveryStatus: 'SENT',
      readAt: null,
      createdAt: new Date(),
    };
    const repo = {
      findByIdempotency: vi.fn().mockResolvedValue(existing),
      findLatestTemplate: vi.fn(),
      insertIgnoreConflict: vi.fn(),
      appendDeliveryAttempt: vi.fn(),
      findById: vi.fn(),
      listInAppForUser: vi.fn(),
      markRead: vi.fn(),
      updateDeliveryStatus: vi.fn(),
      countDeliveryAttempts: vi.fn(),
      getPreferences: vi.fn().mockResolvedValue({
        userId: 'u',
        marketingEmail: false,
        marketingInApp: false,
      }),
      upsertPreferences: vi.fn(),
    };
    const handlers = new NotificationHandlers(
      repo as never,
      { send: vi.fn() } as never,
      { enqueueEmailDelivery: vi.fn() } as never,
    );

    const result = await handlers.notify({
      eventId: 'evt-1',
      recipientUserId: 'u1',
      type: 'account.welcome',
      templateKey: 'account.welcome',
      category: 'TRANSACTIONAL',
      channels: ['IN_APP'],
    });

    expect(result).toEqual({ notificationIds: ['n1'], created: false });
    expect(repo.insertIgnoreConflict).not.toHaveBeenCalled();
  });

  it('sends email via provider on queued delivery', async () => {
    const repo = {
      findByIdempotency: vi.fn(),
      findLatestTemplate: vi.fn(),
      insertIgnoreConflict: vi.fn(),
      appendDeliveryAttempt: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: 'n-email',
        channel: 'EMAIL',
        deliveryStatus: 'PENDING',
        recipientEmail: 'a@example.com',
        title: 'Hi',
        body: 'Body',
      }),
      listInAppForUser: vi.fn(),
      markRead: vi.fn(),
      updateDeliveryStatus: vi.fn(),
      countDeliveryAttempts: vi.fn().mockResolvedValue(0),
    };
    const email = { send: vi.fn().mockResolvedValue({ providerMessageId: 'm1' }) };
    const handlers = new NotificationHandlers(
      repo as never,
      email as never,
      { enqueueEmailDelivery: vi.fn() } as never,
    );

    await handlers.processQueuedDelivery('n-email');
    expect(email.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@example.com', notificationId: 'n-email' }),
    );
    expect(repo.updateDeliveryStatus).toHaveBeenCalledWith('n-email', 'SENT');
  });

  it('skips marketing channels when preferences are off', async () => {
    const repo = {
      findByIdempotency: vi.fn(),
      findLatestTemplate: vi.fn(),
      insertIgnoreConflict: vi.fn(),
      appendDeliveryAttempt: vi.fn(),
      findById: vi.fn(),
      listInAppForUser: vi.fn(),
      markRead: vi.fn(),
      updateDeliveryStatus: vi.fn(),
      countDeliveryAttempts: vi.fn(),
      getPreferences: vi.fn().mockResolvedValue({
        userId: 'u1',
        marketingEmail: false,
        marketingInApp: false,
      }),
      upsertPreferences: vi.fn(),
    };
    const handlers = new NotificationHandlers(
      repo as never,
      { send: vi.fn() } as never,
      { enqueueEmailDelivery: vi.fn() } as never,
    );

    const result = await handlers.notify({
      eventId: 'mkt-1',
      recipientUserId: 'u1',
      type: 'promo.blast',
      templateKey: 'account.welcome',
      category: 'MARKETING',
      channels: ['IN_APP', 'EMAIL'],
    });

    expect(result).toEqual({ notificationIds: [], created: false });
    expect(repo.insertIgnoreConflict).not.toHaveBeenCalled();
  });
});
