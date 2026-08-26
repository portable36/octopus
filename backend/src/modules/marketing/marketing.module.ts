import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MARKETING_OUTBOX_HANDLER } from '../../shared-kernel/application/ports/marketing-outbox-handler.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { GA4_MP_PORT } from './application/ports/ga4-mp.port';
import { MARKETING_EVENT_RECORDER } from './application/ports/marketing-event-recorder.port';
import { META_CAPI_PORT } from './application/ports/meta-capi.port';
import { MarketingDeliveryService } from './application/services/marketing-delivery.service';
import { MarketingOutboxHandlerAdapter } from './infrastructure/access/marketing-outbox-handler.adapter';
import { Ga4MpAdapter } from './infrastructure/integrations/ga4-mp.adapter';
import { MetaCapiAdapter } from './infrastructure/integrations/meta-capi.adapter';
import { MarketingEventOrmEntity } from './infrastructure/persistence/marketing-event.orm-entity';
import { MarketingEventRecorderAdapter } from './infrastructure/persistence/marketing-event-recorder.adapter';
import { PublicMarketingController } from './presentation/http/public-marketing.controller';

@Global()
@Module({
  imports: [DatabaseModule, MikroOrmModule.forFeature([MarketingEventOrmEntity])],
  controllers: [PublicMarketingController],
  providers: [
    MarketingDeliveryService,
    MarketingOutboxHandlerAdapter,
    Ga4MpAdapter,
    MetaCapiAdapter,
    MarketingEventRecorderAdapter,
    { provide: GA4_MP_PORT, useExisting: Ga4MpAdapter },
    { provide: META_CAPI_PORT, useExisting: MetaCapiAdapter },
    { provide: MARKETING_EVENT_RECORDER, useExisting: MarketingEventRecorderAdapter },
    { provide: MARKETING_OUTBOX_HANDLER, useExisting: MarketingOutboxHandlerAdapter },
  ],
  exports: [MARKETING_OUTBOX_HANDLER],
})
export class MarketingModule {}
