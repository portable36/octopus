import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationService } from '../../../identity/application/services/authorization.service';
import {
  TOKEN_SIGNER,
  type TokenSigner,
} from '../../../identity/application/ports/token-signer.interface';
import { JwtAuthGuard } from '../../../identity/presentation/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../identity/presentation/http/guards/permissions.guard';
import { CatalogController } from './catalog.controller';
import {
  CreateProductHandler,
  GetProductHandler,
  ProductLifecycleHandler,
} from '../../application/commands/product.handlers';
import {
  CreateVariantHandler,
  VariantLifecycleHandler,
} from '../../application/commands/variant.handlers';
import {
  CreateCategoryHandler,
  ListCategoriesHandler,
  UpdateCategoryHandler,
} from '../../application/commands/category.handlers';
import {
  CreateStoreOfferHandler,
  StoreOfferLifecycleHandler,
} from '../../application/commands/store-offer.handlers';
import {
  ListProductVariantsHandler,
  ListStoreOffersHandler,
} from '../../application/queries/catalog-vendor.query-handler';

const mockCreateProductHandler = { execute: vi.fn() };
const mockProductLifecycleHandler = {
  submitForReview: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
  archive: vi.fn(),
};
const mockGetProductHandler = { forVendor: vi.fn(), byId: vi.fn() };
const mockListProductVariantsHandler = { execute: vi.fn() };
const mockListStoreOffersHandler = { execute: vi.fn() };
const mockCreateVariantHandler = { execute: vi.fn() };
const mockVariantLifecycleHandler = { activate: vi.fn(), archive: vi.fn() };
const mockCreateCategoryHandler = { execute: vi.fn() };
const mockUpdateCategoryHandler = { update: vi.fn(), archive: vi.fn() };
const mockListCategoriesHandler = { execute: vi.fn(), byId: vi.fn() };
const mockCreateStoreOfferHandler = { execute: vi.fn() };
const mockStoreOfferLifecycleHandler = {
  activate: vi.fn(),
  suspend: vi.fn(),
  updatePrice: vi.fn(),
};

@Module({
  controllers: [CatalogController],
  providers: [
    { provide: CreateProductHandler, useValue: mockCreateProductHandler },
    { provide: ProductLifecycleHandler, useValue: mockProductLifecycleHandler },
    { provide: GetProductHandler, useValue: mockGetProductHandler },
    { provide: ListProductVariantsHandler, useValue: mockListProductVariantsHandler },
    { provide: ListStoreOffersHandler, useValue: mockListStoreOffersHandler },
    { provide: CreateVariantHandler, useValue: mockCreateVariantHandler },
    { provide: VariantLifecycleHandler, useValue: mockVariantLifecycleHandler },
    { provide: CreateCategoryHandler, useValue: mockCreateCategoryHandler },
    { provide: UpdateCategoryHandler, useValue: mockUpdateCategoryHandler },
    { provide: ListCategoriesHandler, useValue: mockListCategoriesHandler },
    { provide: CreateStoreOfferHandler, useValue: mockCreateStoreOfferHandler },
    { provide: StoreOfferLifecycleHandler, useValue: mockStoreOfferLifecycleHandler },
    Reflector,
    AuthorizationService,
    {
      provide: TOKEN_SIGNER,
      useValue: {
        signAccess: async () => {
          throw new Error('unused');
        },
        verifyAccess: async () => {
          throw new Error('unused');
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
class CatalogControllerTestModule {}

describe('CatalogController Authorization', () => {
  let app: INestApplication;
  const verifyAccess = vi.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CatalogControllerTestModule],
    })
      .overrideProvider(TOKEN_SIGNER)
      .useValue({
        signAccess: async () => {
          throw new Error('unused');
        },
        verifyAccess,
      } satisfies TokenSigner)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const response = await request(app.getHttpServer()).post('/products').send({
      vendorId: '00000000-0000-0000-0000-000000000001',
      sku: 'ABC-DEF-1234',
      name: 'Test Product',
    });

    expect(response.status).toBe(401);
  });

  it('rejects CUSTOMER role with 403 Forbidden for product creation', async () => {
    verifyAccess.mockResolvedValue({
      userId: 'customer-user-1',
      tenantId: 'tenant-1',
      roles: ['CUSTOMER'],
      sessionId: 'session-1',
      tokenVersion: 1,
    });

    const response = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', 'Bearer customer-token')
      .send({
        vendorId: '00000000-0000-0000-0000-000000000001',
        sku: 'ABC-DEF-1234',
        name: 'Test Product',
      });

    expect(response.status).toBe(403);
    expect(mockCreateProductHandler.execute).not.toHaveBeenCalled();
  });

  it('rejects VENDOR_OWNER with 403 Forbidden for category patch (requires platform.vendors.write)', async () => {
    verifyAccess.mockResolvedValue({
      userId: 'vendor-owner-1',
      tenantId: 'tenant-1',
      roles: ['VENDOR_OWNER'],
      sessionId: 'session-2',
      tokenVersion: 1,
    });

    const response = await request(app.getHttpServer())
      .patch('/categories/00000000-0000-0000-0000-000000000001')
      .set('Authorization', 'Bearer vendor-token')
      .send({
        name: 'Hacked Category',
      });

    expect(response.status).toBe(403);
    expect(mockUpdateCategoryHandler.update).not.toHaveBeenCalled();
  });

  it('allows PLATFORM_ADMIN to patch category', async () => {
    verifyAccess.mockResolvedValue({
      userId: 'admin-user-1',
      tenantId: 'tenant-1',
      roles: ['PLATFORM_ADMIN'],
      sessionId: 'session-3',
      tokenVersion: 1,
      mfaEnabled: true,
    });

    mockUpdateCategoryHandler.update.mockResolvedValue({
      id: { value: '00000000-0000-0000-0000-000000000001' },
      name: 'Updated Category',
      slug: 'updated-category',
      parentId: null,
      status: 'active',
      sortOrder: 0,
      seo: { title: null, description: null },
    });

    const response = await request(app.getHttpServer())
      .patch('/categories/00000000-0000-0000-0000-000000000001')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Updated Category',
      });

    expect(response.status).toBe(200);
    expect(mockUpdateCategoryHandler.update).toHaveBeenCalled();
  });
});
