import { Module } from '@nestjs/common';
import { AppModule } from '../app.module';

/**
 * SEO BullMQ worker process entry module.
 * Uses the full AppModule graph so catalog/order/identity ports resolve;
 * HTTP is not listened (ApplicationContext only).
 */
@Module({
  imports: [AppModule],
})
export class SeoDiscoveryWorkerAppModule {}
