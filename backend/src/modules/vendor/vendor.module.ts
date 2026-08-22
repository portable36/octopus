import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DatabaseModule } from '../../shared-kernel/infrastructure/persistence/database.module';
import { RegisterVendorHandler } from './application/commands/register-vendor.handler';
import { UpdateVendorHandler } from './application/commands/update-vendor.handler';
import { VendorLifecycleHandler } from './application/commands/vendor-lifecycle.handler';
import { GetVendorHandler } from './application/queries/get-vendor.handler';
import { VENDOR_REPOSITORY } from './application/ports/vendor-repository.interface';
import { VendorOrmEntity } from './infrastructure/persistence/vendor.orm-entity';
import { VendorStaffOrmEntity } from './infrastructure/persistence/vendor-staff.orm-entity';
import { VendorRepositoryAdapter } from './infrastructure/persistence/vendor.repository.adapter';
import { VendorController } from './presentation/http/vendor.controller';

@Module({
  imports: [DatabaseModule, MikroOrmModule.forFeature([VendorOrmEntity, VendorStaffOrmEntity])],
  controllers: [VendorController],
  providers: [
    RegisterVendorHandler,
    VendorLifecycleHandler,
    UpdateVendorHandler,
    GetVendorHandler,
    {
      provide: VENDOR_REPOSITORY,
      useClass: VendorRepositoryAdapter,
    },
  ],
  exports: [VENDOR_REPOSITORY, GetVendorHandler],
})
export class VendorModule {}
