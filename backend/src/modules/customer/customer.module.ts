import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { CustomerHandlers } from './application/commands/customer.handlers';
import { CUSTOMER_REPOSITORY } from './application/ports/customer-repository.interface';
import { CustomerAddressOrmEntity } from './infrastructure/persistence/customer-address.orm-entity';
import { CustomerProfileOrmEntity } from './infrastructure/persistence/customer-profile.orm-entity';
import { CustomerRepositoryAdapter } from './infrastructure/persistence/customer.repository.adapter';
import { CustomerController } from './presentation/http/customer.controller';

@Module({
  imports: [
    DatabaseModule,
    MikroOrmModule.forFeature([CustomerProfileOrmEntity, CustomerAddressOrmEntity]),
  ],
  controllers: [CustomerController],
  providers: [
    CustomerHandlers,
    { provide: CUSTOMER_REPOSITORY, useClass: CustomerRepositoryAdapter },
  ],
  exports: [CustomerHandlers],
})
export class CustomerModule {}
