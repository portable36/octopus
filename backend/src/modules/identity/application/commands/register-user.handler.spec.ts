import { describe, expect, it, vi } from 'vitest';
import { RegisterUserHandler } from './register-user.handler';

describe('RegisterUserHandler', () => {
  it('does not allow public registration to assign privileged roles', async () => {
    const savedUsers: Array<{ roles: readonly string[] }> = [];
    const users = {
      existsByEmail: vi.fn().mockResolvedValue(false),
      save: vi.fn(async (user: { roles: readonly string[] }) => {
        savedUsers.push(user);
      }),
    };
    const passwordHasher = {
      hash: vi.fn().mockResolvedValue('hashed-password'),
    };
    const authSession = {
      issueSession: vi.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresInSeconds: 900,
        user: {
          userId: 'user-1',
          email: 'customer@example.com',
          roles: ['CUSTOMER'],
          mfaEnabled: false,
        },
      }),
    };
    const notifications = {
      notify: vi.fn().mockResolvedValue(undefined),
    };

    const handler = new RegisterUserHandler(
      users as never,
      passwordHasher as never,
      authSession as never,
      notifications as never,
    );

    await handler.execute({
      email: 'customer@example.com',
      name: 'Customer',
      password: 'Str0ng!Passw0rd',
      roles: ['PLATFORM_ADMIN'],
    } as never);

    expect(savedUsers[0]?.roles).toEqual(['CUSTOMER']);
  });
});
