import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PAYMENT_PORT } from '../../shared-kernel/application/ports/payment.port';
import { PAYMENT_CONFIG_PROVISIONER } from '../../shared-kernel/application/ports/payment-config-provisioner.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import {
  CancelCodPaymentHandler,
  CollectCodPaymentHandler,
  CreatePaymentIntentHandler,
  CreateRefundHandler,
  ListPaymentIntentsHandler,
} from './application/commands/payment.handlers';
import { PAYMENT_REFUND_GATEWAY } from './application/ports/payment-refund-gateway.port';
import { PAYMENT_REPOSITORY } from './application/ports/payment-repository.interface';
import { PaymentAuthorizationService } from './application/services/payment-authorization.service';
import { PaymentPortAdapter } from './infrastructure/access/payment-port.adapter';
import { PaymentConfigProvisionerAdapter } from './infrastructure/access/payment-config-provisioner.adapter';
import { StubPaymentRefundGateway } from './infrastructure/gateways/stub-payment-refund.gateway';
import {
  PaymentIntentOrmEntity,
  PaymentOperationOrmEntity,
  PaymentOutboxOrmEntity,
  PaymentRefundOrmEntity,
  PaymentTransactionOrmEntity,
} from './infrastructure/persistence/payment.orm-entity';
import { PaymentRepositoryAdapter } from './infrastructure/persistence/payment.repository.adapter';
import { AdminPaymentController } from './presentation/http/admin-payment.controller';
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
  controllers: [PaymentController, AdminPaymentController],
  providers: [
    PaymentAuthorizationService,
    CreatePaymentIntentHandler,
    CollectCodPaymentHandler,
    CancelCodPaymentHandler,
    CreateRefundHandler,
    ListPaymentIntentsHandler,
    { provide: PAYMENT_REPOSITORY, useClass: PaymentRepositoryAdapter },
    { provide: PAYMENT_REFUND_GATEWAY, useClass: StubPaymentRefundGateway },
    { provide: PAYMENT_PORT, useClass: PaymentPortAdapter },
    { provide: PAYMENT_CONFIG_PROVISIONER, useClass: PaymentConfigProvisionerAdapter },
  ],
  exports: [PAYMENT_PORT, PAYMENT_REPOSITORY, PAYMENT_CONFIG_PROVISIONER, CollectCodPaymentHandler, CreateRefundHandler],
})
export class PaymentModule {}
