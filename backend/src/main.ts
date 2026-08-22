import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { configureApplication } from './shared-kernel/infrastructure/bootstrap/configure-application';
import { registerGracefulShutdown } from './shared-kernel/infrastructure/bootstrap/graceful-shutdown';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(AppConfigService);
  const logger = app.get(Logger);

  app.useLogger(logger);
  app.setGlobalPrefix('api/v1');
  configureApplication(app, config);
  app.enableShutdownHooks();
  registerGracefulShutdown(app, config);

  await app.listen(config.port);
  logger.log(`Application listening on port ${config.port}`);
}

void bootstrap();
