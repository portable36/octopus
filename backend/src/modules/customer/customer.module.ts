import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { CustomerHandlers } from './application/commands/customer.handlers';
import { CUSTOMER_REPOSITORY } from './application/ports/customer-repository.interface';
import { CustomerAddressOrmEntity } from './infrastructure/persistence/customer-address.orm-entity';
import { CustomerProfileOrmEntity } from './infrastructure/persistence/customer-profile.orm-entity';
import {
  CustomerWishlistItemOrmEntity,
  ProductReviewOrmEntity,
} from './infrastructure/persistence/engagement.orm-entity';
import { CustomerRepositoryAdapter } from './infrastructure/persistence/customer.repository.adapter';
import { CustomerController } from './presentation/http/customer.controller';
import { PublicProductReviewsController } from './presentation/http/public-product-reviews.controller';

@Module({
  imports: [
    DatabaseModule,
    MikroOrmModule.forFeature([
      CustomerProfileOrmEntity,
      CustomerAddressOrmEntity,
      CustomerWishlistItemOrmEntity,
      ProductReviewOrmEntity,
    ]),
  ],
  controllers: [CustomerController, PublicProductReviewsController],
  providers: [
    CustomerHandlers,
    { provide: CUSTOMER_REPOSITORY, useClass: CustomerRepositoryAdapter },
  ],
  exports: [CustomerHandlers],
})
export class CustomerModule {}
