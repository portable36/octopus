import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { AppConfigService } from './config/app-config.service';
import { ContextMiddleware } from './common/context/context.middleware';
import { PinoLoggerService } from './common/logger/pino-logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
  ],
  providers: [
    AppConfigService,
    PinoLoggerService,
  ],
  exports: [
    AppConfigService,
    PinoLoggerService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ContextMiddleware)
      .forRoutes('*');
  }
}
