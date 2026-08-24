import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ORDER_PORT } from '../../shared-kernel/application/ports/order.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import {
  CreateOrderFromCheckoutHandler,
  OrderLifecycleHandler,
} from './application/commands/order.handlers';
import { ORDER_REPOSITORY } from './application/ports/order-repository.interface';
import { OrderAuthorizationService } from './application/services/order-authorization.service';
import { OrderPortAdapter } from './infrastructure/access/order-port.adapter';
import { OrderLineOrmEntity, OrderOrmEntity } from './infrastructure/persistence/order.orm-entity';
import { OrderRepositoryAdapter } from './infrastructure/persistence/order.repository.adapter';
import { OrderController } from './presentation/http/order.controller';

@Global()
@Module({
  imports: [DatabaseModule, MikroOrmModule.forFeature([OrderOrmEntity, OrderLineOrmEntity])],
  controllers: [OrderController],
  providers: [
    OrderAuthorizationService,
    CreateOrderFromCheckoutHandler,
    OrderLifecycleHandler,
    { provide: ORDER_REPOSITORY, useClass: OrderRepositoryAdapter },
    { provide: ORDER_PORT, useClass: OrderPortAdapter },
  ],
  exports: [ORDER_PORT, ORDER_REPOSITORY, OrderLifecycleHandler],
})
export class OrderModule {}
