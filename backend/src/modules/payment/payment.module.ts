import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PAYMENT_PORT } from '../../shared-kernel/application/ports/payment.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import {
  CancelCodPaymentHandler,
  CollectCodPaymentHandler,
  CreatePaymentIntentHandler,
} from './application/commands/payment.handlers';
import { PAYMENT_REPOSITORY } from './application/ports/payment-repository.interface';
import { PaymentAuthorizationService } from './application/services/payment-authorization.service';
import { PaymentPortAdapter } from './infrastructure/access/payment-port.adapter';
import {
  PaymentIntentOrmEntity,
  PaymentOperationOrmEntity,
  PaymentOutboxOrmEntity,
  PaymentTransactionOrmEntity,
} from './infrastructure/persistence/payment.orm-entity';
import { PaymentRepositoryAdapter } from './infrastructure/persistence/payment.repository.adapter';
import { PaymentController } from './presentation/http/payment.controller';

@Global()
@Module({
  imports: [
    DatabaseModule,
    MikroOrmModule.forFeature([
      PaymentIntentOrmEntity,
      PaymentTransactionOrmEntity,
      PaymentOperationOrmEntity,
      PaymentOutboxOrmEntity,
    ]),
  ],
  controllers: [PaymentController],
  providers: [
    PaymentAuthorizationService,
    CreatePaymentIntentHandler,
    CollectCodPaymentHandler,
    CancelCodPaymentHandler,
    { provide: PAYMENT_REPOSITORY, useClass: PaymentRepositoryAdapter },
    { provide: PAYMENT_PORT, useClass: PaymentPortAdapter },
  ],
  exports: [PAYMENT_PORT, PAYMENT_REPOSITORY, CollectCodPaymentHandler],
})
export class PaymentModule {}
