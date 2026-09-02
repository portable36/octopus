import '../instrument';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppConfigService } from '../config/app-config.service';
import { flushSentry } from '../instrument';
import { startOpenTelemetry } from '../shared-kernel/infrastructure/observability/otel-bootstrap';
import { SeoDiscoveryWorkerAppModule } from './seo-discovery-worker.module';

async function bootstrap(): Promise<void> {
  const otel = startOpenTelemetry();
  const app = await NestFactory.createApplicationContext(SeoDiscoveryWorkerAppModule, {
    bufferLogs: true,
  });

  const config = app.get(AppConfigService);
  const logger = new Logger('SeoDiscoveryWorkerMain');

  if (!config.seoDiscoveryWorkerEnabled) {
    logger.error('SEO_DISCOVERY_WORKER_ENABLED must be true for the seo-worker process.');
    process.exit(1);
  }

  app.enableShutdownHooks();

  const shutdown = async (signal: string): Promise<void> => {
    logger.log(`Received ${signal}, shutting down SEO worker…`);
    await app.close();
    await otel?.shutdown();
    await flushSentry();
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  logger.log('SEO discovery BullMQ worker process started.');
}

void bootstrap();
