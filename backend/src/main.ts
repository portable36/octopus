import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { Rfc7807ExceptionFilter } from './shared-kernel/infrastructure/filters/rfc7807-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new Rfc7807ExceptionFilter());
  app.enableShutdownHooks();

  await app.listen(config.port);
}

void bootstrap();
