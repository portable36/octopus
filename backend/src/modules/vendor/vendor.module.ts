import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { VENDOR_ACCESS } from '../../shared-kernel/application/ports/vendor-access.port';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { RegisterVendorHandler } from './application/commands/register-vendor.handler';
import { UpdateVendorHandler } from './application/commands/update-vendor.handler';
import { VendorLifecycleHandler } from './application/commands/vendor-lifecycle.handler';
import { GetVendorHandler } from './application/queries/get-vendor.handler';
import { VENDOR_REPOSITORY } from './application/ports/vendor-repository.interface';
import { VendorAccessAdapter } from './infrastructure/access/vendor-access.adapter';
import { VendorOrmEntity } from './infrastructure/persistence/vendor.orm-entity';
import { VendorStaffOrmEntity } from './infrastructure/persistence/vendor-staff.orm-entity';
import { VendorRepositoryAdapter } from './infrastructure/persistence/vendor.repository.adapter';
import { VendorController } from './presentation/http/vendor.controller';
import { AdminVendorController } from './presentation/http/admin-vendor.controller';

@Global()
@Module({
  imports: [DatabaseModule, MikroOrmModule.forFeature([VendorOrmEntity, VendorStaffOrmEntity])],
  controllers: [VendorController, AdminVendorController],
  providers: [
    RegisterVendorHandler,
    VendorLifecycleHandler,
    UpdateVendorHandler,
    GetVendorHandler,
    {
      provide: VENDOR_REPOSITORY,
      useClass: VendorRepositoryAdapter,
    },
    {
      provide: VENDOR_ACCESS,
      useClass: VendorAccessAdapter,
    },
  ],
  exports: [VENDOR_REPOSITORY, VENDOR_ACCESS, GetVendorHandler],
})
export class VendorModule {}
