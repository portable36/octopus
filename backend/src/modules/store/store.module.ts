import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { STORE_ACCESS } from '../../shared-kernel/application/ports/store-access.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { CreateStoreHandler } from './application/commands/create-store.handler';
import {
  CreateStoreDraftHandler,
  GetStoreDraftHandler,
  SubmitStoreDraftHandler,
  UpdateStoreDraftHandler,
  ValidateStoreDraftHandler,
} from './application/commands/store-onboarding.handlers';
import { RetryProvisioningHandler } from './application/commands/retry-provisioning.handler';
import { StoreLifecycleHandler } from './application/commands/store-lifecycle.handler';
import { UpdateStoreHandler } from './application/commands/update-store.handler';
import { GetProvisioningStatusHandler } from './application/queries/get-provisioning-status.handler';
import { GetStoreHandler } from './application/queries/get-store.handler';
import { GetStoreOverviewHandler } from './application/queries/get-store-overview.handler';
import { ListAdminStoresHandler } from './application/queries/list-admin-stores.handler';
import { STORE_ONBOARDING_DRAFT_REPOSITORY } from './application/ports/store-onboarding-draft-repository.interface';
import { STORE_PROVISIONING_REPOSITORY } from './application/ports/store-provisioning-repository.interface';
import { STORE_REPOSITORY } from './application/ports/store-repository.interface';
import { StoreProvisioningOrchestrator } from './application/provisioning/store-provisioning.orchestrator';
import { StoreHealthService } from './application/services/store-health.service';
import { StoreAccessAdapter } from './infrastructure/access/store-access.adapter';
import { StoreDomainOrmEntity } from './infrastructure/persistence/store-domain.orm-entity';
import { StoreOnboardingDraftOrmEntity } from './infrastructure/persistence/store-onboarding-draft.orm-entity';
import { StoreOutboxOrmEntity } from './infrastructure/persistence/store-outbox.orm-entity';
import { StoreProvisioningRunOrmEntity } from './infrastructure/persistence/store-provisioning-run.orm-entity';
import { StoreProvisioningStepOrmEntity } from './infrastructure/persistence/store-provisioning-step.orm-entity';
import { StoreOrmEntity } from './infrastructure/persistence/store.orm-entity';
import { StoreStaffOrmEntity } from './infrastructure/persistence/store-staff.orm-entity';
import { StoreOnboardingDraftRepositoryAdapter } from './infrastructure/persistence/store-onboarding-draft.repository.adapter';
import { StoreProvisioningRepositoryAdapter } from './infrastructure/persistence/store-provisioning.repository.adapter';
import { StoreRepositoryAdapter } from './infrastructure/persistence/store.repository.adapter';
import { StoreController } from './presentation/http/store.controller';
import { AdminStoreController } from './presentation/http/admin-store.controller';

@Global()
@Module({
  imports: [
    DatabaseModule,
    MikroOrmModule.forFeature([
      StoreOrmEntity,
      StoreStaffOrmEntity,
      StoreOutboxOrmEntity,
      StoreOnboardingDraftOrmEntity,
      StoreProvisioningRunOrmEntity,
      StoreProvisioningStepOrmEntity,
      StoreDomainOrmEntity,
    ]),
  ],
  controllers: [StoreController, AdminStoreController],
  providers: [
    CreateStoreHandler,
    CreateStoreDraftHandler,
    GetStoreDraftHandler,
    UpdateStoreDraftHandler,
    ValidateStoreDraftHandler,
    SubmitStoreDraftHandler,
    GetProvisioningStatusHandler,
    RetryProvisioningHandler,
    StoreProvisioningOrchestrator,
    StoreLifecycleHandler,
    UpdateStoreHandler,
    GetStoreHandler,
    ListAdminStoresHandler,
    StoreHealthService,
    GetStoreOverviewHandler,
    {
      provide: STORE_REPOSITORY,
      useClass: StoreRepositoryAdapter,
    },
    {
      provide: STORE_ONBOARDING_DRAFT_REPOSITORY,
      useClass: StoreOnboardingDraftRepositoryAdapter,
    },
    {
      provide: STORE_PROVISIONING_REPOSITORY,
      useClass: StoreProvisioningRepositoryAdapter,
    },
    {
      provide: STORE_ACCESS,
      useClass: StoreAccessAdapter,
    },
  ],
  exports: [STORE_REPOSITORY, STORE_ACCESS, GetStoreHandler],
})
export class StoreModule {}
