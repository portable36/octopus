import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PAYMENT_PORT } from '../../shared-kernel/application/ports/payment.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { CheckoutSubmitHandler } from './application/commands/checkout.handlers';
import { CHECKOUT_REPOSITORY } from './application/ports/checkout-repository.interface';
import {
  CheckoutPaymentIntentOrmEntity,
  CheckoutSubmissionOrmEntity,
} from './infrastructure/persistence/checkout.orm-entity';
import { CheckoutRepositoryAdapter } from './infrastructure/persistence/checkout.repository.adapter';
import { CheckoutPaymentPortAdapter } from './infrastructure/stubs/checkout-payment-port.adapter';
import { CheckoutController } from './presentation/http/checkout.controller';

@Global()
@Module({
  imports: [
    DatabaseModule,
    MikroOrmModule.forFeature([CheckoutSubmissionOrmEntity, CheckoutPaymentIntentOrmEntity]),
  ],
  controllers: [CheckoutController],
  providers: [
    CheckoutSubmitHandler,
    { provide: CHECKOUT_REPOSITORY, useClass: CheckoutRepositoryAdapter },
    { provide: PAYMENT_PORT, useClass: CheckoutPaymentPortAdapter },
  ],
  exports: [PAYMENT_PORT, CheckoutSubmitHandler],
})
export class CheckoutModule {}
