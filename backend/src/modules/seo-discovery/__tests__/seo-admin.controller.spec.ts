import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationService } from '../../identity/application/services/authorization.service';
import {
  TOKEN_SIGNER,
  type TokenSigner,
} from '../../identity/application/ports/token-signer.interface';
import { JwtAuthGuard } from '../../identity/presentation/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../identity/presentation/http/guards/permissions.guard';
import { Rfc7807ExceptionFilter } from '../../../shared-kernel/infrastructure/filters/rfc7807-exception.filter';
import { SeoAdminService } from '../application/services/seo-admin.service';
import { SeoAdminController } from '../presentation/controllers/seo-admin.controller';

const seoAdminService = {
  getHealth: vi.fn(async () => ({
    brokenRedirectsCount: 0,
    missingMetadataCount: 0,
    jobs: {
      sitemap: { status: 'missing', lastUpdatedAt: null, detail: null },
      productFeeds: { status: 'missing', lastUpdatedAt: null, detail: null },
      metaCapi: { status: 'not_configured' },
    },
    recentJobs: [],
  })),
  saveOverride: vi.fn(),
  saveRedirects: vi.fn(),
  enqueueSitemapRefresh: vi.fn(),
  enqueueProductFeedRefresh: vi.fn(),
};

@Module({
  controllers: [SeoAdminController],
  providers: [
    { provide: SeoAdminService, useValue: seoAdminService },
    Reflector,
    AuthorizationService,
    {
      provide: TOKEN_SIGNER,
      useValue: {
        signAccess: async () => {
          throw new Error('signAccess not used');
        },
        verifyAccess: async () => {
          throw new Error('TOKEN_SIGNER stub — override in test module');
        },
      } satisfies TokenSigner,
    },
    {
      provide: APP_GUARD,
      useFactory: (signer: TokenSigner, reflector: Reflector) =>
        new JwtAuthGuard(signer, reflector),
      inject: [TOKEN_SIGNER, Reflector],
    },
    {
      provide: APP_GUARD,
      useFactory: (authorization: AuthorizationService, reflector: Reflector) =>
        new PermissionsGuard(authorization, reflector),
      inject: [AuthorizationService, Reflector],
    },
  ],
})
class SeoAdminControllerTestModule {}

describe('SeoAdminController authorization', () => {
  let app: INestApplication;
  const verifyAccess = vi.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SeoAdminControllerTestModule],
    })
      .overrideProvider(TOKEN_SIGNER)
      .useValue({
        signAccess: async () => 'unused',
        verifyAccess,
      } satisfies TokenSigner)
      .compile();

    app = moduleRef.createNestApplication({ bodyParser: true });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    );
    app.useGlobalFilters(new Rfc7807ExceptionFilter());
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    verifyAccess.mockReset();
    seoAdminService.getHealth.mockClear();
  });

  it('GET /api/v1/admin/seo/health returns 403 for non-admin customer tokens', async () => {
    verifyAccess.mockResolvedValue({
      sub: 'user-1',
      email: 'customer@shop.test',
      roles: ['CUSTOMER'],
      mfaEnabled: false,
    });

    await request(app.getHttpServer())
      .get('/api/v1/admin/seo/health')
      .set('Authorization', 'Bearer customer-token')
      .expect(403);

    expect(seoAdminService.getHealth).not.toHaveBeenCalled();
  });

  it('GET /api/v1/admin/seo/health returns 200 for settings.read authorized admin', async () => {
    verifyAccess.mockResolvedValue({
      sub: 'owner-1',
      email: 'owner@vendor.test',
      roles: ['VENDOR_OWNER'],
      mfaEnabled: false,
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/seo/health')
      .set('Authorization', 'Bearer owner-token')
      .expect(200);

    expect(res.body).toMatchObject({ brokenRedirectsCount: 0 });
    expect(seoAdminService.getHealth).toHaveBeenCalledTimes(1);
  });

  it('POST /api/v1/admin/seo/overrides returns 403 for read-only vendor staff', async () => {
    verifyAccess.mockResolvedValue({
      sub: 'staff-1',
      email: 'staff@vendor.test',
      roles: ['VENDOR_STAFF'],
      mfaEnabled: false,
    });

    await request(app.getHttpServer())
      .post('/api/v1/admin/seo/overrides')
      .set('Authorization', 'Bearer staff-token')
      .send({
        entityType: 'product',
        entityId: '11111111-1111-4111-8111-111111111111',
        title: 'Custom title',
      })
      .expect(403);
  });
});
