import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PAYMENT_PORT } from '../../shared-kernel/application/ports/payment.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import {
  CancelCodPaymentHandler,
  CollectCodPaymentHandler,
  CreatePaymentIntentHandler,
  CreateRefundHandler,
} from './application/commands/payment.handlers';
import { PAYMENT_REFUND_GATEWAY } from './application/ports/payment-refund-gateway.port';
import { PAYMENT_REPOSITORY } from './application/ports/payment-repository.interface';
import { PaymentAuthorizationService } from './application/services/payment-authorization.service';
import { PaymentPortAdapter } from './infrastructure/access/payment-port.adapter';
import { StubPaymentRefundGateway } from './infrastructure/gateways/stub-payment-refund.gateway';
import {
  PaymentIntentOrmEntity,
  PaymentOperationOrmEntity,
  PaymentOutboxOrmEntity,
  PaymentRefundOrmEntity,
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
      PaymentRefundOrmEntity,
    ]),
  ],
  controllers: [PaymentController],
  providers: [
    PaymentAuthorizationService,
    CreatePaymentIntentHandler,
    CollectCodPaymentHandler,
    CancelCodPaymentHandler,
    CreateRefundHandler,
    { provide: PAYMENT_REPOSITORY, useClass: PaymentRepositoryAdapter },
    { provide: PAYMENT_REFUND_GATEWAY, useClass: StubPaymentRefundGateway },
    { provide: PAYMENT_PORT, useClass: PaymentPortAdapter },
  ],
  exports: [PAYMENT_PORT, PAYMENT_REPOSITORY, CollectCodPaymentHandler, CreateRefundHandler],
})
export class PaymentModule {}
