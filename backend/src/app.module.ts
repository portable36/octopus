import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { validateEnv } from './config/env.validation';
import { AppConfigService } from './config/app-config.service';
import { ContextMiddleware } from './shared-kernel/infrastructure/context/context.middleware';
import { CatalogModule } from './modules/catalog/catalog.module';
import { IdentityModule } from './modules/identity/identity.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { VendorModule } from './modules/vendor/vendor.module';
import { StoreModule } from './modules/store/store.module';
import { PosModule } from './modules/pos/pos.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { CartModule } from './modules/cart/cart.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { OrderModule } from './modules/order/order.module';
import { DatabaseModule } from './shared-kernel/infrastructure/persistence/database.module';
import { HealthModule } from './shared-kernel/infrastructure/health/health.module';
import { RedisModule } from './shared-kernel/infrastructure/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const pinoHttp: Record<string, unknown> = {
          level: config.logLevel,
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.refreshToken',
            ],
            remove: true,
          },
          genReqId: (
            req: { headers: Record<string, unknown> },
            res: { setHeader: (k: string, v: string) => void },
          ) => {
            const existing = req.headers['x-request-id'];
            const requestId = typeof existing === 'string' ? existing : randomUUID();
            res.setHeader('x-request-id', requestId);
            return requestId;
          },
        };

        if (!config.isProduction) {
          pinoHttp.transport = {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
            },
          };
        }

        return { pinoHttp };
      },
    }),
    RedisModule,
    DatabaseModule,
    HealthModule,
    CatalogModule,
    IdentityModule,
    TenancyModule,
    VendorModule,
    StoreModule,
    PosModule,
    InventoryModule,
    PricingModule,
    CartModule,
    OrderModule,
    CheckoutModule,
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware).forRoutes('{*splat}');
  }
}
