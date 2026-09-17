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

  it('sends PUSH when active devices exist', async () => {
    const repo = {
      findByIdempotency: vi.fn().mockResolvedValue(null),
      findLatestTemplate: vi.fn().mockResolvedValue(null),
      insertIgnoreConflict: vi.fn(async (input: { id: string }) => ({
        ...input,
        readAt: null,
      })),
      appendDeliveryAttempt: vi.fn(),
      updateDeliveryStatus: vi.fn(),
      listActivePushDevices: vi.fn().mockResolvedValue([
        {
          id: 'd1',
          userId: 'u1',
          platform: 'web',
          token: 'tok-secret',
          tokenFingerprint: 'fp',
          label: null,
          lastSeenAt: new Date(),
          createdAt: new Date(),
          revokedAt: null,
        },
      ]),
      getPreferences: vi.fn().mockResolvedValue({
        userId: 'u1',
        marketingEmail: false,
        marketingInApp: false,
      }),
    };
    const push = {
      send: vi.fn().mockResolvedValue({ providerMessageId: 'p1', deliveredCount: 1 }),
    };
    const handlers = new NotificationHandlers(
      repo as never,
      { send: vi.fn() } as never,
      { enqueueEmailDelivery: vi.fn() } as never,
      undefined,
      push as never,
    );

    const result = await handlers.notify({
      eventId: 'push-1',
      recipientUserId: 'u1',
      type: 'fulfillment.shipment_shipped',
      templateKey: 'fulfillment.shipment_shipped',
      category: 'TRANSACTIONAL',
      channels: ['PUSH'],
      data: { orderNumber: 'O1', courier: 'Pathao', trackingCode: 'T1' },
    });

    expect(result.created).toBe(true);
    expect(push.send).toHaveBeenCalledWith(
      expect.objectContaining({ tokens: ['tok-secret'], title: expect.any(String) }),
    );
    expect(repo.appendDeliveryAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'PUSH', status: 'SENT' }),
    );
    expect(repo.updateDeliveryStatus).toHaveBeenCalledWith(expect.any(String), 'SENT');
  });

  it('fails PUSH with NO_PUSH_DEVICES when none registered', async () => {
    const repo = {
      findByIdempotency: vi.fn().mockResolvedValue(null),
      findLatestTemplate: vi.fn().mockResolvedValue(null),
      insertIgnoreConflict: vi.fn(async (input: { id: string }) => ({
        ...input,
        readAt: null,
      })),
      appendDeliveryAttempt: vi.fn(),
      updateDeliveryStatus: vi.fn(),
      countDeliveryAttempts: vi.fn().mockResolvedValue(0),
      listActivePushDevices: vi.fn().mockResolvedValue([]),
      getPreferences: vi.fn().mockResolvedValue({
        userId: 'u1',
        marketingEmail: false,
        marketingInApp: false,
      }),
    };
    const push = { send: vi.fn() };
    const handlers = new NotificationHandlers(
      repo as never,
      { send: vi.fn() } as never,
      { enqueueEmailDelivery: vi.fn() } as never,
      undefined,
      push as never,
    );

    await handlers.notify({
      eventId: 'push-2',
      recipientUserId: 'u1',
      type: 'fulfillment.shipment_shipped',
      templateKey: 'fulfillment.shipment_shipped',
      category: 'TRANSACTIONAL',
      channels: ['PUSH'],
      data: { orderNumber: 'O1', courier: 'Pathao', trackingCode: 'T1' },
    });

    expect(push.send).not.toHaveBeenCalled();
    expect(repo.appendDeliveryAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'PUSH', status: 'FAILED', errorCode: 'NO_PUSH_DEVICES' }),
    );
  });

  it('upserts push devices by fingerprint and omits tokens from list', async () => {
    const upsertPushDevice = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'd1',
        userId: 'u1',
        platform: 'android',
        token: 'same-token',
        tokenFingerprint: 'abc',
        label: 'phone',
        lastSeenAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        revokedAt: null,
      })
      .mockResolvedValueOnce({
        id: 'd1',
        userId: 'u1',
        platform: 'android',
        token: 'same-token',
        tokenFingerprint: 'abc',
        label: 'phone',
        lastSeenAt: new Date('2026-01-02T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        revokedAt: null,
      });
    const listActivePushDevices = vi.fn().mockResolvedValue([
      {
        id: 'd1',
        userId: 'u1',
        platform: 'android',
        token: 'same-token',
        tokenFingerprint: 'abc',
        label: 'phone',
        lastSeenAt: new Date(),
        createdAt: new Date(),
        revokedAt: null,
      },
    ]);
    const repo = {
      upsertPushDevice,
      listActivePushDevices,
      revokePushDevice: vi.fn(),
    };
    const handlers = new NotificationHandlers(
      repo as never,
      { send: vi.fn() } as never,
      { enqueueEmailDelivery: vi.fn() } as never,
    );

    const first = await handlers.registerPushDevice({
      userId: 'u1',
      platform: 'android',
      token: 'same-token',
      label: 'phone',
    });
    const second = await handlers.registerPushDevice({
      userId: 'u1',
      platform: 'android',
      token: 'same-token',
      label: 'phone',
    });
    expect(first.id).toBe(second.id);
    expect(upsertPushDevice).toHaveBeenCalledTimes(2);

    const listed = await handlers.listPushDevices('u1');
    expect(listed).toHaveLength(1);
    expect(listed[0]).not.toHaveProperty('token');
    expect(listed[0]).toMatchObject({ id: 'd1', platform: 'android', label: 'phone' });
  });

  it('lists templates and recent deliveries for admin read models', async () => {
    const listTemplates = vi.fn().mockResolvedValue([
      {
        id: 't1',
        templateKey: 'account.welcome',
        channel: 'EMAIL',
        locale: 'en',
        version: 1,
        subject: 'Welcome',
        bodyText: 'Hi',
      },
    ]);
    const listRecentForAdmin = vi.fn().mockResolvedValue([
      {
        id: 'n1',
        eventId: 'e1',
        recipientUserId: 'u1',
        recipientEmail: 'a@example.com',
        notificationType: 'account.welcome',
        channel: 'EMAIL',
        locale: 'en',
        templateKey: 'account.welcome',
        templateVersion: 1,
        title: 'Welcome',
        body: 'Hi',
        payload: {},
        deliveryStatus: 'SENT',
        readAt: null,
        createdAt: new Date('2026-09-17T00:00:00.000Z'),
      },
    ]);
    const listDeliveryAttempts = vi.fn().mockResolvedValue([
      {
        id: 'a1',
        notificationId: 'n1',
        channel: 'EMAIL',
        attemptNumber: 1,
        status: 'SENT',
        providerMessageId: null,
        errorCode: null,
        createdAt: new Date('2026-09-17T00:00:01.000Z'),
      },
    ]);
    const handlers = new NotificationHandlers(
      { listTemplates, listRecentForAdmin, listDeliveryAttempts } as never,
      { send: vi.fn() } as never,
      { enqueueEmailDelivery: vi.fn() } as never,
    );

    await expect(handlers.listTemplatesForAdmin()).resolves.toHaveLength(1);
    await expect(handlers.listRecentForAdmin({ limit: 20 })).resolves.toHaveLength(1);
    await expect(handlers.listDeliveryAttemptsForAdmin('n1')).resolves.toHaveLength(1);
    expect(listRecentForAdmin).toHaveBeenCalledWith({ limit: 20 });
  });
});
