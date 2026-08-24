import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { CartCommandHandler } from './application/commands/cart.handlers';
import { CART_REPOSITORY } from './application/ports/cart-repository.interface';
import { CartLineOrmEntity, CartOrmEntity } from './infrastructure/persistence/cart.orm-entity';
import { CartRepositoryAdapter } from './infrastructure/persistence/cart.repository.adapter';
import { CartController } from './presentation/http/cart.controller';
import { CartPortAdapter } from './infrastructure/access/cart-port.adapter';
import { CART_PORT } from '../../shared-kernel/application/ports/cart.port';

@Global()
@Module({
  imports: [DatabaseModule, MikroOrmModule.forFeature([CartOrmEntity, CartLineOrmEntity])],
  controllers: [CartController],
  providers: [
    CartCommandHandler,
    { provide: CART_REPOSITORY, useClass: CartRepositoryAdapter },
    { provide: CART_PORT, useClass: CartPortAdapter },
  ],
  exports: [CART_REPOSITORY, CartCommandHandler, CART_PORT],
})
export class CartModule {}
