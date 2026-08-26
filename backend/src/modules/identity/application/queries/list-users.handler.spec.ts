import { describe, expect, it, vi } from 'vitest';
import { ForbiddenRoleError } from '../errors/identity.errors';
import { ListUsersHandler } from './list-users.handler';

describe('ListUsersHandler', () => {
  it('rejects non-platform actors', async () => {
    const users = { listRecent: vi.fn() };
    const handler = new ListUsersHandler(users as never);
    await expect(
      handler.listRecentForPlatform({ actorRoles: ['CUSTOMER'], limit: 10 }),
    ).rejects.toBeInstanceOf(ForbiddenRoleError);
    expect(users.listRecent).not.toHaveBeenCalled();
  });

  it('lists recent users for platform admin', async () => {
    const rows = [{ id: { value: 'u1' } }];
    const users = { listRecent: vi.fn().mockResolvedValue(rows) };
    const handler = new ListUsersHandler(users as never);
    const result = await handler.listRecentForPlatform({
      actorRoles: ['PLATFORM_ADMIN'],
      limit: 15,
    });
    expect(users.listRecent).toHaveBeenCalledWith(15);
    expect(result).toBe(rows);
  });
});
