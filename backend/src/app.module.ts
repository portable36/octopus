import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { SentryModule } from '@sentry/nestjs/setup';
import { randomUUID } from 'node:crypto';
import { validateEnv, type Env } from './config/env.validation';
import { AppConfigModule } from './config/app-config.module';
import { ContextMiddleware } from './shared-kernel/infrastructure/context/context.middleware';
import { buildRequestLogBindings } from './shared-kernel/infrastructure/observability/pino-request-bindings';
import { HttpMetricsInterceptor } from './shared-kernel/infrastructure/observability/http-metrics.interceptor';
import { RequestLogContextInterceptor } from './shared-kernel/infrastructure/observability/request-log-context.interceptor';
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
import { PaymentModule } from './modules/payment/payment.module';
import { FulfillmentModule } from './modules/fulfillment/fulfillment.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MediaModule } from './modules/media/media.module';
import { AuditModule } from './modules/audit/audit.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { SearchModule } from './modules/search/search.module';
import { PayoutModule } from './modules/payout/payout.module';
import { DatabaseModule } from './shared-kernel/infrastructure/persistence/database.module';
import { HealthModule } from './shared-kernel/infrastructure/health/health.module';
import { RedisModule } from './shared-kernel/infrastructure/redis/redis.module';
import { NotificationModule } from './modules/notification/notification.module';
import { CustomerModule } from './modules/customer/customer.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { SeoDiscoveryModule } from './modules/seo-discovery/seo-discovery.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
      validate: validateEnv,
    }),
    AppConfigModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => {
        const logLevel = configService.get('LOG_LEVEL', { infer: true });
        const isProduction = configService.get('NODE_ENV', { infer: true }) === 'production';
        const pinoHttp: Record<string, unknown> = {
          level: logLevel,
          customAttributeKeys: {
            responseTime: 'durationMs',
          },
          customProps: (req: {
            id?: unknown;
            method?: string;
            url?: string;
            route?: { path?: string };
          }) => buildRequestLogBindings(req),
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

        if (!isProduction) {
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
    PaymentModule,
    FulfillmentModule,
    CheckoutModule,
    SettingsModule,
    MediaModule,
    AuditModule,
    PayoutModule,
    NotificationModule,
    CustomerModule,
    SearchModule,
    MarketingModule,
    ReportingModule,
    SeoDiscoveryModule,
    MessagingModule,
    ReturnsModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: RequestLogContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware).forRoutes('{*splat}');
  }
}
