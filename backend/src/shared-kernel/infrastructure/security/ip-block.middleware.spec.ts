import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { IpBlockMiddleware } from './ip-block.middleware';
import type { IpBlockPort } from '../../application/ports/ip-block.port';

function mockRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    type() {
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe('IpBlockMiddleware', () => {
  it('exempts health live/ready', async () => {
    const isBlocked = vi.fn();
    const middleware = new IpBlockMiddleware({ isBlocked } as unknown as IpBlockPort);
    const next = vi.fn();
    middleware.use({ path: '/api/v1/health/live', ip: '203.0.113.10' } as Request, mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
    expect(isBlocked).not.toHaveBeenCalled();
  });

  it('returns 403 IP_BLOCKED when blocked', async () => {
    const isBlocked = vi.fn().mockResolvedValue(true);
    const middleware = new IpBlockMiddleware({ isBlocked } as unknown as IpBlockPort);
    const next = vi.fn();
    const res = mockRes();
    middleware.use({ path: '/api/v1/catalog/products', ip: '203.0.113.10' } as Request, res, next);
    await vi.waitFor(() => expect(res.statusCode).toBe(403));
    expect(next).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({ code: 'IP_BLOCKED', status: 403 });
  });

  it('continues when not blocked', async () => {
    const isBlocked = vi.fn().mockResolvedValue(false);
    const middleware = new IpBlockMiddleware({ isBlocked } as unknown as IpBlockPort);
    const next = vi.fn();
    middleware.use(
      { path: '/api/v1/catalog/products', ip: '203.0.113.10' } as Request,
      mockRes(),
      next,
    );
    await vi.waitFor(() => expect(next).toHaveBeenCalledOnce());
  });
});
