// Must load before Nest / OTel so Sentry can patch modules when enabled.
import './instrument';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { configureApplication } from './shared-kernel/infrastructure/bootstrap/configure-application';
import { registerGracefulShutdown } from './shared-kernel/infrastructure/bootstrap/graceful-shutdown';
import { flushSentry } from './instrument';
import { startOpenTelemetry } from './shared-kernel/infrastructure/observability/otel-bootstrap';

async function bootstrap(): Promise<void> {
  const otel = startOpenTelemetry();
  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false });
  const config = app.get(AppConfigService);
  const logger = app.get(Logger);

  app.useLogger(logger);
  app.setGlobalPrefix('api/v1');
  configureApplication(app, config);
  app.enableShutdownHooks();
  registerGracefulShutdown(app, config, async () => {
    await otel?.shutdown();
    await flushSentry();
  });

  await app.listen(config.port);
  logger.log(`Application listening on port ${config.port}`);
}

void bootstrap();
