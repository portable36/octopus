import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { AppConfigService } from './config/app-config.service';
import { ContextMiddleware } from './shared-kernel/infrastructure/context/context.middleware';
import { CatalogModule } from './modules/catalog/catalog.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    CatalogModule,
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware).forRoutes('{*splat}');
  }
}
