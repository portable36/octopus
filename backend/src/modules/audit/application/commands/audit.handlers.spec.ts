import { describe, expect, it, vi } from 'vitest';
import { AuditAccessDeniedError } from '../errors/audit.errors';
import { AuditHandlers } from './audit.handlers';

describe('AuditHandlers.listRecent', () => {
  it('rejects non-platform actors', async () => {
    const audits = { listRecent: vi.fn(), append: vi.fn() };
    const handler = new AuditHandlers(audits as never);
    await expect(handler.listRecent(['CUSTOMER'], 10, 'auth.')).rejects.toBeInstanceOf(
      AuditAccessDeniedError,
    );
    expect(audits.listRecent).not.toHaveBeenCalled();
  });

  it('forwards actionPrefix for platform admin', async () => {
    const rows = [{ id: '1' }];
    const audits = { listRecent: vi.fn().mockResolvedValue(rows), append: vi.fn() };
    const handler = new AuditHandlers(audits as never);
    const result = await handler.listRecent(['PLATFORM_ADMIN'], 25, 'auth.login');
    expect(audits.listRecent).toHaveBeenCalledWith(25, 'auth.login');
    expect(result).toBe(rows);
  });
});
