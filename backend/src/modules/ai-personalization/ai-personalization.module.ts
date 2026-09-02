import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ABANDONED_CART_OUTBOX_HANDLER } from '../../shared-kernel/application/ports/abandoned-cart-outbox-handler.port';
import { ABANDONED_CART_RECOVERY_PORT } from '../../shared-kernel/application/ports/abandoned-cart-recovery.port';
import { AppConfigModule } from '../../config/app-config.module';
import { CartModule } from '../cart/cart.module';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { COMPLETED_ORDER_BASKETS_PORT } from './application/ports/completed-order-baskets.port';
import { PRODUCT_ASSOCIATION_REPOSITORY } from './application/ports/product-association-repository.interface';
import { AbandonedCartRecoveryService } from './application/services/abandoned-cart-recovery.service';
import { AiRecommendationService } from './application/services/ai-recommendation.service';
import { CoPurchaseAnalyzerService } from './application/services/co-purchase-analyzer.service';
import { PurchasePatternAnalysisService } from './application/services/purchase-pattern-analysis.service';
import { AbandonedCartOutboxHandlerAdapter } from './infrastructure/access/abandoned-cart-outbox-handler.adapter';
import { AbandonedCartRecoveryPortAdapter } from './infrastructure/access/abandoned-cart-recovery-port.adapter';
import { CompletedOrderBasketsAdapter } from './infrastructure/access/completed-order-baskets.adapter';
import { ProductAssociation } from './infrastructure/entities/product-association.entity';
import { CartAbandonedOutboxPublisher } from './infrastructure/persistence/cart-abandoned-outbox.publisher';
import { ProductAssociationRepositoryAdapter } from './infrastructure/persistence/product-association.repository.adapter';
import { AbandonedCartSchedulerService } from './jobs/abandoned-cart-scheduler.service';
import { AiPersonalizationEnqueuerService } from './jobs/ai-personalization-enqueuer.service';
import { AiPersonalizationWorker } from './jobs/ai-personalization.worker';
import { RecommendationsController } from './presentation/http/recommendations.controller';

@Global()
@Module({
  imports: [DatabaseModule, AppConfigModule, CartModule, MikroOrmModule.forFeature([ProductAssociation])],
  controllers: [RecommendationsController],
  providers: [
    AiRecommendationService,
    CoPurchaseAnalyzerService,
    PurchasePatternAnalysisService,
    AbandonedCartRecoveryService,
    AbandonedCartSchedulerService,
    CartAbandonedOutboxPublisher,
    AiPersonalizationEnqueuerService,
    AiPersonalizationWorker,
    { provide: PRODUCT_ASSOCIATION_REPOSITORY, useClass: ProductAssociationRepositoryAdapter },
    { provide: COMPLETED_ORDER_BASKETS_PORT, useClass: CompletedOrderBasketsAdapter },
    { provide: ABANDONED_CART_RECOVERY_PORT, useClass: AbandonedCartRecoveryPortAdapter },
    { provide: ABANDONED_CART_OUTBOX_HANDLER, useClass: AbandonedCartOutboxHandlerAdapter },
  ],
  exports: [AiRecommendationService, ABANDONED_CART_RECOVERY_PORT, ABANDONED_CART_OUTBOX_HANDLER],
})
export class AiPersonalizationModule {}
