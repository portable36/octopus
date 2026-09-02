import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../config/env.validation';
import { SeoDiscoveryModule } from '../modules/seo-discovery/seo-discovery.module';

/** Minimal Nest context for the dedicated SEO BullMQ worker process. */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
      validate: validateEnv,
    }),
    SeoDiscoveryModule,
  ],
})
export class SeoDiscoveryWorkerAppModule {}
