import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { STORE_ACCESS } from '../../shared-kernel/application/ports/store-access.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { CreateStoreHandler } from './application/commands/create-store.handler';
import { StoreLifecycleHandler } from './application/commands/store-lifecycle.handler';
import { UpdateStoreHandler } from './application/commands/update-store.handler';
import { GetStoreHandler } from './application/queries/get-store.handler';
import { STORE_REPOSITORY } from './application/ports/store-repository.interface';
import { StoreAccessAdapter } from './infrastructure/access/store-access.adapter';
import { StoreOrmEntity } from './infrastructure/persistence/store.orm-entity';
import { StoreStaffOrmEntity } from './infrastructure/persistence/store-staff.orm-entity';
import { StoreRepositoryAdapter } from './infrastructure/persistence/store.repository.adapter';
import { StoreController } from './presentation/http/store.controller';
import { AdminStoreController } from './presentation/http/admin-store.controller';

@Global()
@Module({
  imports: [DatabaseModule, MikroOrmModule.forFeature([StoreOrmEntity, StoreStaffOrmEntity])],
  controllers: [StoreController, AdminStoreController],
  providers: [
    CreateStoreHandler,
    StoreLifecycleHandler,
    UpdateStoreHandler,
    GetStoreHandler,
    {
      provide: STORE_REPOSITORY,
      useClass: StoreRepositoryAdapter,
    },
    {
      provide: STORE_ACCESS,
      useClass: StoreAccessAdapter,
    },
  ],
  exports: [STORE_REPOSITORY, STORE_ACCESS, GetStoreHandler],
})
export class StoreModule {}
