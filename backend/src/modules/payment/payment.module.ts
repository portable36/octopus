import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PAYMENT_PORT } from '../../shared-kernel/application/ports/payment.port';
import { PAYMENT_CONFIG_PROVISIONER } from '../../shared-kernel/application/ports/payment-config-provisioner.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { RedisModule } from '../../shared-kernel/infrastructure/redis/redis.module';
import {
  CancelCodPaymentHandler,
  CollectCodPaymentHandler,
  CreatePaymentIntentHandler,
  CreateRefundHandler,
  ListPaymentIntentsHandler,
} from './application/commands/payment.handlers';
import { ProcessGatewayCallbackHandler } from './application/commands/payment-gateway.handlers';
import { PAYMENT_REFUND_GATEWAY } from './application/ports/payment-refund-gateway.port';
import { PAYMENT_REPOSITORY } from './application/ports/payment-repository.interface';
import { PaymentAuthorizationService } from './application/services/payment-authorization.service';
import { PaymentPortAdapter } from './infrastructure/access/payment-port.adapter';
import { PaymentConfigProvisionerAdapter } from './infrastructure/access/payment-config-provisioner.adapter';
import { SslCommerzGatewayAdapter } from './infrastructure/gateways/sslcommerz-gateway.adapter';
import { BkashGatewayAdapter } from './infrastructure/gateways/bkash-gateway.adapter';
import { NagadGatewayAdapter } from './infrastructure/gateways/nagad-gateway.adapter';
import { PaymentGatewayRegistry } from './infrastructure/gateways/payment-gateway-registry';
import { PaymentGatewayRefundDispatcher } from './infrastructure/gateways/payment-gateway-refund-dispatcher';
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
import { PaymentGatewayController } from './presentation/http/payment-gateway.controller';

@Global()
@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    MikroOrmModule.forFeature([
      PaymentIntentOrmEntity,
      PaymentTransactionOrmEntity,
      PaymentOperationOrmEntity,
      PaymentOutboxOrmEntity,
      PaymentRefundOrmEntity,
    ]),
  ],
  controllers: [PaymentController, AdminPaymentController, PaymentGatewayController],
  providers: [
    PaymentAuthorizationService,
    CreatePaymentIntentHandler,
    CollectCodPaymentHandler,
    CancelCodPaymentHandler,
    CreateRefundHandler,
    ListPaymentIntentsHandler,
    ProcessGatewayCallbackHandler,
    SslCommerzGatewayAdapter,
    BkashGatewayAdapter,
    NagadGatewayAdapter,
    PaymentGatewayRegistry,
    PaymentGatewayRefundDispatcher,
    { provide: PAYMENT_REPOSITORY, useClass: PaymentRepositoryAdapter },
    { provide: PAYMENT_REFUND_GATEWAY, useClass: PaymentGatewayRefundDispatcher },
    { provide: PAYMENT_PORT, useClass: PaymentPortAdapter },
    { provide: PAYMENT_CONFIG_PROVISIONER, useClass: PaymentConfigProvisionerAdapter },
  ],
  exports: [
    PAYMENT_PORT,
    PAYMENT_REPOSITORY,
    PAYMENT_CONFIG_PROVISIONER,
    CollectCodPaymentHandler,
    CreateRefundHandler,
    ProcessGatewayCallbackHandler,
    PaymentGatewayRegistry,
  ],
})
export class PaymentModule {}
