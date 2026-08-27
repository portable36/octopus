import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApiTestApp } from './create-api-test-app';

describe('API HTTP contracts (Nest + Supertest)', () => {
  let app: INestApplication;
  const verifyAccess = vi.fn();

  beforeAll(async () => {
    app = await createApiTestApp({ verifyAccess });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    verifyAccess.mockReset();
  });

  it('GET /api/v1/probe/live is public', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/probe/live').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /api/v1/probe/me returns 401 without bearer', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/probe/me').expect(401);
    expect(res.body).toMatchObject({
      status: 401,
      title: expect.any(String),
    });
  });

  it('GET /api/v1/probe/me returns principal when token verifies', async () => {
    verifyAccess.mockResolvedValue({
      sub: 'user-1',
      email: 'a@b.co',
      roles: ['CUSTOMER'],
      mfaEnabled: false,
    });
    const res = await request(app.getHttpServer())
      .get('/api/v1/probe/me')
      .set('Authorization', 'Bearer good')
      .expect(200);
    expect(res.body).toEqual({
      userId: 'user-1',
      email: 'a@b.co',
      roles: ['CUSTOMER'],
      mfaEnabled: false,
    });
  });

  it('GET /api/v1/probe/platform returns 403 for customer', async () => {
    verifyAccess.mockResolvedValue({
      sub: 'user-1',
      email: 'a@b.co',
      roles: ['CUSTOMER'],
      mfaEnabled: false,
    });
    await request(app.getHttpServer())
      .get('/api/v1/probe/platform')
      .set('Authorization', 'Bearer good')
      .expect(403);
  });

  it('GET /api/v1/probe/platform returns 403 when platform admin lacks MFA', async () => {
    verifyAccess.mockResolvedValue({
      sub: 'admin-1',
      email: 'admin@b.co',
      roles: ['PLATFORM_ADMIN'],
      mfaEnabled: false,
    });
    await request(app.getHttpServer())
      .get('/api/v1/probe/platform')
      .set('Authorization', 'Bearer good')
      .expect(403);
  });

  it('GET /api/v1/probe/platform returns 200 for MFA-enabled platform admin', async () => {
    verifyAccess.mockResolvedValue({
      sub: 'admin-1',
      email: 'admin@b.co',
      roles: ['PLATFORM_ADMIN'],
      mfaEnabled: true,
    });
    const res = await request(app.getHttpServer())
      .get('/api/v1/probe/platform')
      .set('Authorization', 'Bearer good')
      .expect(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('POST /api/v1/probe/echo accepts a public JSON body', async () => {
    // DTO decorator metadata is not emitted under Vitest/esbuild; ValidationPipe
    // forbidNonWhitelisted is covered by configureApplication + existing unit specs.
    const res = await request(app.getHttpServer())
      .post('/api/v1/probe/echo')
      .send({ email: 'ok@example.com', name: 'Ada' })
      .expect(201);
    expect(res.body).toEqual({ email: 'ok@example.com', name: 'Ada' });
  });
});
