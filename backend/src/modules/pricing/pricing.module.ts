import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PRICING_PORT } from '../../shared-kernel/application/ports/pricing.port';
import { TAX_CONFIG_PROVISIONER } from '../../shared-kernel/application/ports/tax-config-provisioner.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import {
  PricingQuoteHandler,
  PromotionCommandHandler,
} from './application/commands/pricing.handlers';
import { PROMOTION_REPOSITORY } from './application/ports/promotion-repository.interface';
import { PricingAuthorizationService } from './application/services/pricing-authorization.service';
import { PricingPortAdapter } from './infrastructure/access/pricing-port.adapter';
import { TaxConfigProvisionerAdapter } from './infrastructure/access/tax-config-provisioner.adapter';
import {
  PromotionOrmEntity,
  PromotionUsageOrmEntity,
} from './infrastructure/persistence/promotion.orm-entity';
import { PromotionRepositoryAdapter } from './infrastructure/persistence/promotion.repository.adapter';
import { PricingController } from './presentation/http/pricing.controller';

@Global()
@Module({
  imports: [
    DatabaseModule,
    MikroOrmModule.forFeature([PromotionOrmEntity, PromotionUsageOrmEntity]),
  ],
  controllers: [PricingController],
  providers: [
    PricingAuthorizationService,
    PromotionCommandHandler,
    PricingQuoteHandler,
    { provide: PROMOTION_REPOSITORY, useClass: PromotionRepositoryAdapter },
    { provide: PRICING_PORT, useClass: PricingPortAdapter },
    { provide: TAX_CONFIG_PROVISIONER, useClass: TaxConfigProvisionerAdapter },
  ],
  exports: [PRICING_PORT, PROMOTION_REPOSITORY, TAX_CONFIG_PROVISIONER, PricingQuoteHandler],
})
export class PricingModule {}
